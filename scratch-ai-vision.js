(function (Scratch) {
  "use strict";

  class ScratchAIVisionTest {
    getInfo() {
      return {
        id: "scratchaivisiontest",
        name: "Scratch AI Vision TEST",
        blocks: [
          {
            opcode: "test",
            blockType: Scratch.BlockType.REPORTER,
            text: "test Vision"
          }
        ]
      };
    }

    test() {
      return "Scratch AI Vision fonctionne !";
    }
  }

  Scratch.extensions.register(new ScratchAIVisionTest());
})(Scratch);
