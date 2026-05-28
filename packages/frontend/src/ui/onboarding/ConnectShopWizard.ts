import { api } from "../../api/client.js";
import { patchState } from "../../app/state.js";

export class ConnectShopWizard {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  render(): void {
    this.container.innerHTML = `
      <div class="wizard">
        <h2>Shop verbinden</h2>
        <section>
          <h3>Shopify</h3>
          <input id="shopify-shop" placeholder="mein-shop.myshopify.com" />
          <button id="shopify-connect">OAuth starten</button>
        </section>
        <section>
          <h3>WordPress</h3>
          <input id="wp-url" placeholder="https://meinshop.de" />
          <input id="wp-user" placeholder="Benutzername" />
          <input id="wp-pass" type="password" placeholder="App-Passwort" />
          <button id="wp-connect">Verbinden</button>
        </section>
        <section>
          <h3>Greenfield</h3>
          <input id="gf-name" placeholder="Shop-Name" />
          <button id="gf-create">Shop generieren</button>
        </section>
        <ul id="shop-list"></ul>
      </div>`;

    this.container.querySelector("#shopify-connect")?.addEventListener("click", () => void this.shopify());
    this.container.querySelector("#wp-connect")?.addEventListener("click", () => void this.wordpress());
    this.container.querySelector("#gf-create")?.addEventListener("click", () => void this.greenfield());
    void this.loadShops();
  }

  private async loadShops(): Promise<void> {
    try {
      const res = await api<{ shops: Array<{ id: string; platform: string; display_name: string }> }>(
        "/v1/shops",
      );
      const list = this.container.querySelector("#shop-list") as HTMLElement;
      list.innerHTML = res.shops
        .map(
          (s) =>
            `<li><button data-id="${s.id}" class="select-shop">${s.platform}: ${s.display_name ?? s.id}</button></li>`,
        )
        .join("");
      list.querySelectorAll(".select-shop").forEach((btn) => {
        btn.addEventListener("click", () => {
          patchState({ shopConnectionId: (btn as HTMLElement).dataset.id ?? null });
          alert("Shop ausgewählt für JARVIS.");
        });
      });
    } catch {
      /* not logged in */
    }
  }

  private async shopify(): Promise<void> {
    const shop = (this.container.querySelector("#shopify-shop") as HTMLInputElement).value;
    const res = await api<{ oauth_url: string }>(
      `/v1/shops/connect/shopify/start?shop=${encodeURIComponent(shop)}`,
    );
    window.open(res.oauth_url, "_blank");
  }

  private async wordpress(): Promise<void> {
    const res = await api<{ shop_connection_id: string }>("/v1/shops/connect/wordpress", {
      method: "POST",
      body: JSON.stringify({
        site_url: (this.container.querySelector("#wp-url") as HTMLInputElement).value,
        username: (this.container.querySelector("#wp-user") as HTMLInputElement).value,
        app_password: (this.container.querySelector("#wp-pass") as HTMLInputElement).value,
      }),
    });
    patchState({ shopConnectionId: res.shop_connection_id });
    await this.loadShops();
  }

  private async greenfield(): Promise<void> {
    const res = await api<{ shop_connection_id: string; deploy_url: string }>(
      "/v1/shops/greenfield",
      {
        method: "POST",
        body: JSON.stringify({
          name: (this.container.querySelector("#gf-name") as HTMLInputElement).value,
        }),
      },
    );
    patchState({ shopConnectionId: res.shop_connection_id });
    await this.loadShops();
  }
}
