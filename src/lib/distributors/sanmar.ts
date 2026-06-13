import type {
  DistributorAdapter,
  DistributorProductInput,
  DistributorVariantInput,
  InventoryLevel,
} from "./types";

/**
 * SanMar adapter (PromoStandards). SERVER-ONLY — reads credentials from env.
 *
 * Status: scaffold. Credentials load + validate, but the actual SOAP calls are
 * not wired yet — pending SanMar web-services enablement + endpoint URLs. Once
 * those land, fill in the TODOs and map responses onto the normalized types.
 *
 * Auth is the SanMar triple: customer number + username + password.
 */

type SanMarEnv = "edev" | "production";

type SanMarConfig = {
  customerNumber: string;
  username: string;
  password: string;
  env: SanMarEnv;
};

function loadConfig(): SanMarConfig {
  const customerNumber = process.env.SANMAR_CUSTOMER_NUMBER;
  const username = process.env.SANMAR_USERNAME;
  const password = process.env.SANMAR_PASSWORD;
  if (!customerNumber || !username || !password) {
    throw new Error(
      "SanMar adapter requires SANMAR_CUSTOMER_NUMBER, SANMAR_USERNAME, and SANMAR_PASSWORD",
    );
  }
  const env: SanMarEnv = process.env.SANMAR_ENV === "production" ? "production" : "edev";
  return { customerNumber, username, password, env };
}

const NOT_WIRED = "SanMar web services aren't wired yet — pending API access and endpoint URLs.";

export const sanmarAdapter: DistributorAdapter = {
  slug: "sanmar",

  async syncProducts(): Promise<DistributorProductInput[]> {
    loadConfig(); // validates creds are present
    // TODO: PromoStandards Product Data (or the SFTP product-data file for bulk
    // load) → map to DistributorProductInput[].
    throw new Error(NOT_WIRED);
  },

  async syncVariants(_styleNumber: string): Promise<DistributorVariantInput[]> {
    loadConfig();
    // TODO: PromoStandards Product Data variants + Pricing & Configuration →
    // map to DistributorVariantInput[].
    throw new Error(NOT_WIRED);
  },

  async getInventory(_styleNumber: string): Promise<InventoryLevel[]> {
    loadConfig();
    // TODO: PromoStandards Inventory service → map to InventoryLevel[].
    throw new Error(NOT_WIRED);
  },
};
