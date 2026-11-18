class HelloWorld {
  getInfo() {
    return {
      id: 'helloworld',
      name: 'Test TurboWarp',
      blocks: [
        {
          opcode: 'hello',
          blockType: Scratch.BlockType.REPORTER,
          text: 'test extension'
        }
      ]
    };
  }

  hello() {
    return 'Ça fonctionne !';
  }
}

Scratch.extensions.register(new HelloWorld());
