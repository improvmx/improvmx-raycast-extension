import { getPreferenceValues } from "@raycast/api";
import { fetchAccountAPI } from "./utils";

export default async () => {
  const API_TOKEN = getPreferenceValues().api_token;
  const API_URL = "https://api.improvmx.com/v3/";
  const auth = Buffer.from("api:" + API_TOKEN).toString("base64");

  await fetchAccountAPI(auth, API_URL);
};
