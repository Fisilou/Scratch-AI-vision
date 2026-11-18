
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
      this.popup = null;
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

    async analyze(args) {
      if (this.busy) return;

      this.busy = true;
      this.answer = "";
      this.status = "Ouverture de Scratch AI Vision...";

      try {
        if (typeof window === "undefined") {
          throw new Error("Navigateur indisponible.");
        }

        this.popup = window.open(VISION_PAGE, "_blank");

        if (!this.popup) {
          throw new Error("Fenêtre bloquée par le navigateur.");
        }

        const data = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            window.removeEventListener("message", this.listener);
            reject(new Error("Temps d'attente dépassé."));
          }, 180000);

          this.listener = (event) => {
            if (event.origin !== PAGE_ORIGIN) return;

            if (event.data?.type !== "SCRATCH_AI_VISION_IMAGE") {
              return;
            }

            clearTimeout(timeout);
            window.removeEventListener("message", this.listener);
            resolve(event.data);
          };

          window.addEventListener("message", this.listener);
        });

        this.status = "Envoi au moteur Moondream...";

        const response = await fetch(WORKER_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            image: data.image,
            question: String(args.QUESTION || "Que vois-tu ?"),
            turnstileToken: data.turnstileToken
          })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.error || "Erreur du serveur."
          );
        }

        this.answer = String(result.answer || "");
        this.status = "Analyse terminée !";

      } catch (error) {
        this.answer = "";
        this.status = "Erreur : " + error.message;

      } finally {
        this.busy = false;

        if (this.popup && !this.popup.closed) {
          this.popup.close();
        }

        this.popup = null;
      }
    }
  }

  Scratch.extensions.register(new ScratchAIVision());

})(Scratch);
