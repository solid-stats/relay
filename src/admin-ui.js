export const getAdminPageHtml = () => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SG Stats Relay Admin</title>
    <style>
      :root {
        color-scheme: light;
        font-family: "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif;
      }

      body {
        margin: 0;
        background: linear-gradient(120deg, #f6f8fb 0%, #eef3ff 100%);
        color: #121212;
      }

      .layout {
        max-width: 560px;
        margin: 48px auto;
        padding: 24px;
      }

      .card {
        background: #ffffff;
        border-radius: 14px;
        box-shadow: 0 10px 30px rgba(24, 42, 95, 0.1);
        padding: 24px;
      }

      h1 {
        margin: 0 0 12px;
        font-size: 24px;
      }

      p {
        margin: 0 0 20px;
        color: #4e5870;
      }

      label {
        display: block;
        font-size: 14px;
        font-weight: 600;
        margin: 12px 0 6px;
      }

      input {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid #ccd5e5;
        border-radius: 10px;
        padding: 10px 12px;
        font-size: 14px;
      }

      button {
        margin-top: 16px;
        border: 0;
        border-radius: 10px;
        padding: 10px 14px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        background: #005bd4;
        color: #fff;
      }

      pre {
        margin-top: 16px;
        background: #0f172a;
        color: #d4e4ff;
        border-radius: 10px;
        padding: 12px;
        overflow: auto;
        white-space: pre-wrap;
        word-break: break-all;
      }

      .error {
        color: #b11f35;
        margin-top: 12px;
        font-size: 14px;
      }
    </style>
  </head>
  <body>
    <main class="layout">
      <section class="card">
        <h1>Relay Token Generator</h1>
        <p>Create personal relay tokens without SSH access to the server.</p>

        <form id="token-form">
          <label for="username">Username</label>
          <input id="username" name="username" required placeholder="nickname" />

          <label for="days">Expires in (days)</label>
          <input id="days" name="days" type="number" min="1" max="3650" value="30" required />

          <button type="submit">Create token</button>
        </form>

        <div id="error" class="error"></div>
        <pre id="token-output" hidden></pre>
      </section>
    </main>

    <script>
      const form = document.getElementById('token-form');
      const errorEl = document.getElementById('error');
      const outputEl = document.getElementById('token-output');

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        errorEl.textContent = '';
        outputEl.hidden = true;

        const username = document.getElementById('username').value.trim();
        const expiresInDays = Number(document.getElementById('days').value);

        try {
          const response = await fetch('/admin/tokens', {
            method: 'POST',
            headers: {
              'content-type': 'application/json'
            },
            body: JSON.stringify({ username, expiresInDays })
          });

          const payload = await response.json();

          if (!response.ok) {
            throw new Error(payload.error || 'Failed to create token.');
          }

          outputEl.textContent = payload.token;
          outputEl.hidden = false;
        } catch (error) {
          errorEl.textContent = error.message;
        }
      });
    </script>
  </body>
</html>`;
