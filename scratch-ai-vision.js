
(function (Scratch) {
  "use strict";

  const WORKER_URL =
    "https://scratch-ai-vision.842n4525mv.workers.dev";

  const VISION_PAGE =
    "https://fisilou.github.io/Scratch-AI-vision/vision.html";

  const PAGE_ORIGIN = "https://fisilou.github.io";

  class ScratchAIVision {
    constructor() {
      this.answer = "";
      this.status = "Prêt";
      this.busy = false;
      this.image = null;
      this.listener = null;
    }

    getInfo() {
      return {
        id: "scratchaivision",
        name: "Scratch AI Vision",
        color1: "#7557D9",
        color2: "#6044BD",
        color3: "#4B329B",
        blocks: [
          {
            opcode: "chooseImage",
            blockType: Scratch.BlockType.COMMAND,
            text: "choisir une image"
          },
          {
            opcode: "analyze",
            blockType: Scratch.BlockType.COMMAND,
            text: "analyser une image avec la question [QUESTION]",
            arguments: {
              QUESTION: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "Que vois-tu sur cette image ?"
              }
            }
          },
          {
            opcode: "getAnswer",
            blockType: Scratch.BlockType.REPORTER,
            text: "réponse de Vision"
          },
          {
            opcode: "getStatus",
            blockType: Scratch.BlockType.REPORTER,
            text: "état de Vision"
          },
          {
            opcode: "isBusy",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "Vision travaille ?"
          }
        ]
      };
    }

    getAnswer() {
      return this.answer;
    }

    getStatus() {
      return this.status;
    }

    isBusy() {
      return this.busy;
    }

    async chooseImage() {
      this.status = "Ouverture du sélecteur...";

      try {
        const popup = await this.openPage();

        if (!popup) {
          throw new Error("Ouverture bloquée. Autorise les fenêtres.");
        }

        this.status = "Choisis une image dans la fenêtre.";

        if (this.listener) {
          window.removeEventListener("message", this.listener);
        }

        this.listener = (event) => {
          if (event.origin !== PAGE_ORIGIN) return;
          if (event.data?.type !== "SCRATCH_AI_VISION_IMAGE") return;

          if (typeof event.data.image !== "string" ||
              !event.data.image.startsWith("data:image/")) {
            this.status = "Image invalide.";
            return;
          }

          this.image = event.data.image;
          this.answer = "";
          this.status = "Image chargée !";
          window.removeEventListener("message", this.listener);
          this.listener = null;
        };

        window.addEventListener("message", this.listener);

      } catch (error) {
        this.status = "Erreur : " + error.message;
      }
    }

    async openPage() {
      if (typeof Scratch.openWindow === "function") {
        return await Scratch.openWindow(VISION_PAGE);
      }

      if (typeof window !== "undefined") {
        return window.open(VISION_PAGE, "_blank");
      }

      return null;
    }

    async analyze(args) {
      if (this.busy) return;

      if (!this.image) {
        this.status = "Choisis d'abord une image !";
        return;
      }

      this.busy = true;
      this.answer = "";
      this.status = "Analyse en cours...";

      try {
        const response = await fetch(WORKER_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            image: this.image,
            question: String(
              args.QUESTION || "Que vois-tu ?"
            )
          })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Erreur du serveur.");
        }

        this.answer = String(result.answer || "");
        this.status = "Analyse terminée !";

      } catch (error) {
        this.status = "Erreur : " + error.message;

      } finally {
        this.busy = false;
      }
    }
  }

  Scratch.extensions.register(new ScratchAIVision());

})(Scratch);
