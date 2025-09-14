const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("BrazilianIdentitySBT", function () {
  async function deployBrazilianIdentitySBTFixture() {
    const [owner, minter, user1, user2] = await ethers.getSigners();

    const BrazilianIdentitySBT = await ethers.getContractFactory("BrazilianIdentitySBT");
    const contract = await BrazilianIdentitySBT.deploy(
      "Brazilian Identity SBT",
      "BRSBT", 
      minter.address
    );

    return { contract, owner, minter, user1, user2 };
  }

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      const { contract } = await loadFixture(deployBrazilianIdentitySBTFixture);
      
      expect(await contract.name()).to.equal("Brazilian Identity SBT");
      expect(await contract.symbol()).to.equal("BRSBT");
    });

    it("Should set the correct owner and minter", async function () {
      const { contract, owner, minter } = await loadFixture(deployBrazilianIdentitySBTFixture);
      
      expect(await contract.owner()).to.equal(owner.address);
      expect(await contract.minter()).to.equal(minter.address);
    });

    it("Should start with zero total supply", async function () {
      const { contract } = await loadFixture(deployBrazilianIdentitySBTFixture);
      
      expect(await contract.totalSupply()).to.equal(0);
    });
  });

  describe("Minting", function () {
    it("Should allow minter to mint SBT", async function () {
      const { contract, minter, user1 } = await loadFixture(deployBrazilianIdentitySBTFixture);
      
      const cpfHash = ethers.keccak256(ethers.toUtf8Bytes("12345678901"));
      
      await expect(contract.connect(minter).mint(user1.address, cpfHash))
        .to.emit(contract, "IdentityVerified")
        .withArgs(user1.address, 1, cpfHash);
      
      expect(await contract.balanceOf(user1.address)).to.equal(1);
      expect(await contract.ownerOf(1)).to.equal(user1.address);
      expect(await contract.isVerified(user1.address)).to.be.true;
      expect(await contract.getTokenId(user1.address)).to.equal(1);
      expect(await contract.totalSupply()).to.equal(1);
    });

    it("Should not allow non-minter to mint", async function () {
      const { contract, user1, user2 } = await loadFixture(deployBrazilianIdentitySBTFixture);
      
      const cpfHash = ethers.keccak256(ethers.toUtf8Bytes("12345678901"));
      
      await expect(contract.connect(user1).mint(user2.address, cpfHash))
        .to.be.revertedWithCustomError(contract, "NotMinter");
    });

    it("Should not allow minting with invalid CPF hash", async function () {
      const { contract, minter, user1 } = await loadFixture(deployBrazilianIdentitySBTFixture);
      
      await expect(contract.connect(minter).mint(user1.address, ethers.ZeroHash))
        .to.be.revertedWithCustomError(contract, "InvalidCPF");
    });

    it("Should not allow minting to already verified address", async function () {
      const { contract, minter, user1 } = await loadFixture(deployBrazilianIdentitySBTFixture);
      
      const cpfHash1 = ethers.keccak256(ethers.toUtf8Bytes("12345678901"));
      const cpfHash2 = ethers.keccak256(ethers.toUtf8Bytes("98765432101"));
      
      await contract.connect(minter).mint(user1.address, cpfHash1);
      
      await expect(contract.connect(minter).mint(user1.address, cpfHash2))
        .to.be.revertedWithCustomError(contract, "AlreadyVerified");
    });

    it("Should not allow using same CPF hash twice", async function () {
      const { contract, minter, user1, user2 } = await loadFixture(deployBrazilianIdentitySBTFixture);
      
      const cpfHash = ethers.keccak256(ethers.toUtf8Bytes("12345678901"));
      
      await contract.connect(minter).mint(user1.address, cpfHash);
      
      await expect(contract.connect(minter).mint(user2.address, cpfHash))
        .to.be.revertedWithCustomError(contract, "CPFAlreadyUsed");
    });
  });

  describe("Soulbound functionality", function () {
    it("Should not allow transfers", async function () {
      const { contract, minter, user1, user2 } = await loadFixture(deployBrazilianIdentitySBTFixture);
      
      const cpfHash = ethers.keccak256(ethers.toUtf8Bytes("12345678901"));
      await contract.connect(minter).mint(user1.address, cpfHash);
      
      await expect(contract.connect(user1).transferFrom(user1.address, user2.address, 1))
        .to.be.revertedWithCustomError(contract, "TokenNotTransferable");
    });

    it("Should not allow approvals", async function () {
      const { contract, minter, user1, user2 } = await loadFixture(deployBrazilianIdentitySBTFixture);
      
      const cpfHash = ethers.keccak256(ethers.toUtf8Bytes("12345678901"));
      await contract.connect(minter).mint(user1.address, cpfHash);
      
      await expect(contract.connect(user1).approve(user2.address, 1))
        .to.be.revertedWithCustomError(contract, "TokenNotTransferable");
    });

    it("Should not allow setApprovalForAll", async function () {
      const { contract, minter, user1, user2 } = await loadFixture(deployBrazilianIdentitySBTFixture);
      
      const cpfHash = ethers.keccak256(ethers.toUtf8Bytes("12345678901"));
      await contract.connect(minter).mint(user1.address, cpfHash);
      
      await expect(contract.connect(user1).setApprovalForAll(user2.address, true))
        .to.be.revertedWithCustomError(contract, "TokenNotTransferable");
    });
  });

  describe("Access Control", function () {
    it("Should allow owner to update minter", async function () {
      const { contract, owner, user1 } = await loadFixture(deployBrazilianIdentitySBTFixture);
      
      await expect(contract.connect(owner).updateMinter(user1.address))
        .to.emit(contract, "MinterUpdated")
        .withArgs(await contract.minter(), user1.address);
      
      expect(await contract.minter()).to.equal(user1.address);
    });

    it("Should not allow non-owner to update minter", async function () {
      const { contract, user1, user2 } = await loadFixture(deployBrazilianIdentitySBTFixture);
      
      await expect(contract.connect(user1).updateMinter(user2.address))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should allow owner to pause and unpause", async function () {
      const { contract, owner, minter, user1 } = await loadFixture(deployBrazilianIdentitySBTFixture);
      
      await contract.connect(owner).pause();
      expect(await contract.paused()).to.be.true;
      
      const cpfHash = ethers.keccak256(ethers.toUtf8Bytes("12345678901"));
      await expect(contract.connect(minter).mint(user1.address, cpfHash))
        .to.be.revertedWith("Pausable: paused");
      
      await contract.connect(owner).unpause();
      expect(await contract.paused()).to.be.false;
      
      await expect(contract.connect(minter).mint(user1.address, cpfHash))
        .to.emit(contract, "IdentityVerified");
    });
  });

  describe("View functions", function () {
    it("Should correctly report CPF usage", async function () {
      const { contract, minter, user1 } = await loadFixture(deployBrazilianIdentitySBTFixture);
      
      const cpfHash = ethers.keccak256(ethers.toUtf8Bytes("12345678901"));
      
      expect(await contract.isCPFUsed(cpfHash)).to.be.false;
      
      await contract.connect(minter).mint(user1.address, cpfHash);
      
      expect(await contract.isCPFUsed(cpfHash)).to.be.true;
    });

    it("Should return zero token ID for unverified users", async function () {
      const { contract, user1 } = await loadFixture(deployBrazilianIdentitySBTFixture);
      
      expect(await contract.getTokenId(user1.address)).to.equal(0);
      expect(await contract.isVerified(user1.address)).to.be.false;
    });
  });
});