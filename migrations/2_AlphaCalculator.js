const AlphaSwapAmtCalc = artifacts.require('./AlphaSwapAmtCalc.sol');

module.exports = async (deployer, network, accounts) => {
  await deployer.deploy(DocumentsManager);
  console.log(
    '\n   > DocumentsManager deployment: Success -->',
    DocumentsManager.address
  );
};
