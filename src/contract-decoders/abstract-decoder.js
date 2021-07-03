class AbstractDecoder {
  constructor(web3, logger) {
    this.web3 = web3;
    this.logger = logger;
  }

  get addressConstants() {
    return {
      sushi: '0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f'.toLowerCase(),
      uni: '0x7a250d5630b4cf539739df2c5dacb4c659f2488d'.toLowerCase(),
      zeroX: '0x080bf510FCbF18b91105470639e9561022937712'.toLowerCase(),
      nullAddress: '0x0000000000000000000000000000000000000000',
    };
  }
}

module.exports = AbstractDecoder;
