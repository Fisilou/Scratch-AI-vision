
(function (Scratch) {
  "use strict";

  const WORKER_URL =
    "https://scratch-ai-vision.842n4525mv.workers.dev";

  // IMPORTANT : colle ta Sitekey PUBLIQUE sur une seule ligne.
  // Ne mets jamais ta Secret Key ici.
  const SITEKEY = "0x4 AAAAAAGG6r 03bK
_SoKgoM";

  class ScratchAIVision {
    constructor() {
      this.imageData = "";
      this.answer = "";
      this.status = "En attente";
      this.error = "";
      this.turnstileToken = "";
      this.modal = null;
      this.widgetId = null;
    }

    getInfo() {
      return {
        id: "scratchaivision",
        name: "Scratch AI Vision",
        color1: "#FF7900",
        color2: "#CC5200",
        color3: "#993D00",

        blocks: [
          {
            opcode: "demanderImage",
            blockType: Scratch.BlockType.COMMAND,
            text: "📎 choisir une image"
          },
          {
            opcode: "analyserImage",
            blockType: Scratch.BlockType.COMMAND,
            text: "analyser l'image avec la question [QUESTION]",
            arguments: {
              QUESTION: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "Décris cette image."
              }
            }
          },
          {
            opcode: "reponseVision",
            blockType: Scratch.BlockType.REPORTER,
            text: "réponse de Vision"
          },
          {
            opcode: "statutVision",
            blockType: Scratch.BlockType.REPORTER,
            text: "statut de Vision"
          },
          {
            opcode: "erreurVision",
            blockType: Scratch.BlockType.REPORTER,
            text: "erreur de Vision"
          },
          {
            opcode: "effacerImage",
            blockType: Scratch.BlockType.COMMAND,
            text: "effacer l'image"
          }
        ]
      };
    }

    chargerTurnstile() {
      return new Promise((resolve, reject) => {
        if (window.turnstile) {
          resolve();
          return;
        }

        const existing = document.querySelector(
          'script[src*="challenges.cloudflare.com/turnstile"]'
        );

        if (existing) {
          existing.addEventListener("load", resolve, { once: true });
          existing.addEventListener(
            "error",
            () => reject(new Error("Impossible de charger Turnstile.")),
            { once: true }
          );
          return;
        }

        const script = document.createElement("script");

        script.src =
          "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

        script.async = true;
        script.defer = true;

        script.onload = resolve;
        script.onerror = () =>
          reject(new Error("Impossible de charger Turnstile."));

        document.head.appendChild(script);
      });
    }

    async demanderImage() {
      this.error = "";
      this.status = "Sélection d'une image";
      this.turnstileToken = "";

      if (
        !SITEKEY ||
        SITEKEY === "REMPLACE_PAR_TA_SITEKEY_PUBLIQUE"
      ) {
        this.error = "Sitekey publique manquante.";
        this.status = "Configuration incomplète";
        return;
      }

      return new Promise((resolve) => {
        const overlay = document.createElement("div");

        overlay.style.cssText = `
          position:fixed;
          inset:0;
          z-index:999999;
          background:rgba(0,0,0,.82);
          display:flex;
          align-items:center;
          justify-content:center;
          font-family:Arial,sans-serif;
          padding:15px;
        `;

        const panel = document.createElement("div");

        panel.style.cssText = `
          width:min(440px,95vw);
          background:#171717;
          color:white;
          border:2px solid #FF7900;
          border-radius:18px;
          padding:25px;
          box-shadow:0 0 35px rgba(255,121,0,.3);
          text-align:center;
        `;

        panel.innerHTML = `
          <h2 style="color:#FF7900;margin-top:0">
            Scratch AI Vision
          </h2>

          <p>Choisis une image à analyser.</p>

          <button id="savChoose" style="
            background:#FF7900;
            color:white;
            border:0;
            border-radius:9px;
            padding:13px 22px;
            font-weight:bold;
            cursor:pointer;
          ">Choisir une image</button>

          <input id="savFile" type="file"
            accept="image/*" style="display:none">

          <p id="savStatus" style="font-size:13px">
            En attente d'une image
          </p>

          <div id="savPreview"></div>

          <div id="savCaptcha"
            style="display:flex;justify-content:center;margin:15px 0">
          </div>

          <button id="savCancel" style="
            background:#333;
            color:white;
            border:1px solid #666;
            border-radius:8px;
            padding:10px 20px;
            cursor:pointer;
          ">Annuler</button>
        `;

        overlay.appendChild(panel);
        document.body.appendChild(overlay);

        this.modal = overlay;

        const choose = panel.querySelector("#savChoose");
        const fileInput = panel.querySelector("#savFile");
        const status = panel.querySelector("#savStatus");
        const preview = panel.querySelector("#savPreview");
        const captcha = panel.querySelector("#savCaptcha");
        const cancel = panel.querySelector("#savCancel");

        let finished = false;

        const close = (success) => {
          if (finished) return;
          finished = true;

          if (this.widgetId !== null && window.turnstile) {
            try {
              window.turnstile.remove(this.widgetId);
            } catch (_) {}
          }

          this.widgetId = null;
          overlay.remove();
          this.modal = null;

          if (!success) {
            this.turnstileToken = "";
          }

          resolve();
        };

        cancel.onclick = () => close(false);

        choose.onclick = () => fileInput.click();

        fileInput.onchange = async () => {
          const file = fileInput.files[0];

          if (!file) return;

          if (!file.type.startsWith("image/")) {
            status.textContent = "Fichier image invalide.";
            return;
          }

          if (file.size > 7 * 1024 * 1024) {
            status.textContent =
              "Image trop volumineuse (7 Mo maximum).";
            return;
          }

          status.textContent = "Chargement de l'image...";

          const reader = new FileReader();

          reader.onload = async () => {
            this.imageData = reader.result;

            preview.innerHTML = "";

            const img = document.createElement("img");
            img.src = this.imageData;

            img.style.cssText =
              "max-width:100%;max-height:160px;border-radius:10px;margin:10px 0";

            preview.appendChild(img);

            status.textContent =
              "Image chargée. Vérifie que tu n'es pas un robot.";

            captcha.innerHTML = "";

            try {
              await this.chargerTurnstile();

              if (finished) return;

              this.widgetId = window.turnstile.render(captcha, {
                sitekey: SITEKEY,

                callback: (token) => {
                  this.turnstileToken = token;
                  this.status = "Image prête à analyser";

                  close(true);
                },

                "expired-callback": () => {
                  this.turnstileToken = "";
                  status.textContent =
                    "Validation expirée. Recommence.";
                },

                "error-callback": () => {
                  this.error = "Erreur de vérification Turnstile.";
                  status.textContent = this.error;
                }
              });

            } catch (error) {
              this.error = error.message || String(error);
              status.textContent = this.error;
            }
          };

          reader.onerror = () => {
            this.error = "Impossible de lire cette image.";
            status.textContent = this.error;
          };

          reader.readAsDataURL(file);
        };
      });
    }

    async analyserImage(args) {
      this.answer = "";
      this.error = "";

      if (!this.imageData) {
        this.error = "Aucune image sélectionnée.";
        this.status = "Erreur";
        return;
      }

      if (!this.turnstileToken) {
        this.error =
          "Validation de sécurité manquante. Choisis à nouveau une image.";
        this.status = "Validation nécessaire";
        return;
      }

      this.status = "Analyse en cours...";

      try {
        const response = await fetch(WORKER_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            image: this.imageData,
            question: String(
              args.QUESTION || "Décris cette image."
            ),
            turnstileToken: this.turnstileToken
          })
        });

        // Un jeton Turnstile ne sert qu'une seule fois.
        this.turnstileToken = "";

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.error ||
            "Erreur du serveur : " + response.status
          );
        }

        this.answer = String(result.answer || "");
        this.status = "Analyse terminée";

      } catch (error) {
        this.error = error.message || String(error);
        this.status = "Erreur d'analyse";
      }
    }

    reponseVision() {
      return this.answer;
    }

    statutVision() {
      return this.status;
    }

    erreurVision() {
      return this.error;
    }

    effacerImage() {
      this.imageData = "";
      this.answer = "";
      this.error = "";
      this.turnstileToken = "";
      this.status = "Image effacée";
    }
  }

  Scratch.extensions.register(new ScratchAIVision());

})(Scratch);
