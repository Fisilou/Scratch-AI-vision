
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

    async analyze(args) {
      if (this.busy) {
        this.status = "Une analyse est déjà en cours";
        return;
      }

      this.busy = true;
      this.answer = "";
      this.status = "Ouverture de la sélection d'image...";

      let popup = null;

      try {
        popup = window.open(VISION_PAGE, "_blank");

        if (!popup) {
          throw new Error(
            "La fenêtre a été bloquée par le navigateur."
          );
        }

        this.status = "Choisis une image et valide Turnstile";

        const data = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            window.removeEventListener("message", listener);
            reject(new Error("Délai dépassé."));
          }, 180000);

          const listener = (event) => {
            if (event.origin !== PAGE_ORIGIN) return;
            if (event.source !== popup) return;

            if (
              !event.data ||
              event.data.type !== "SCRATCH_AI_VISION_IMAGE"
            ) return;

            clearTimeout(timeout);
            window.removeEventListener("message", listener);
            resolve(event.data);
          };

          window.addEventListener("message", listener);
        });

        if (
          typeof data.image !== "string" ||
          !data.image.startsWith("data:image/")
        ) {
          throw new Error("Image invalide.");
        }

        if (typeof data.turnstileToken !== "string" ||
            !data.turnstileToken) {
          throw new Error("Vérification Turnstile manquante.");
        }

        this.status = "Analyse de l'image en cours...";

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
            result.error || "Erreur pendant l'analyse."
          );
        }

        this.answer = String(result.answer || "");
        this.status = "Analyse terminée";

      } catch (error) {
        this.answer = "";
        this.status = "Erreur : " + error.message;
      } finally {
        this.busy = false;
        if (popup && !popup.closed) popup.close();
      }
    }
  }

  Scratch.extensions.register(new ScratchAIVision());

})(Scratch);
