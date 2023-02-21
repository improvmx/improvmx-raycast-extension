import { LocalStorage } from "@raycast/api";
import fetch from "node-fetch";

const fetchAccountAPI = async (auth: string, API_URL: string ) => {
  try {
    const apiResponseAccount = await fetch(API_URL + "account", {
      headers: {
        Authorization: "Basic " + auth,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const account = await apiResponseAccount.json() as any;

    await LocalStorage.setItem("improvmx_email", await account.account.email as string);
    await LocalStorage.setItem("improvmx_plan_name", await account.account.plan.name as string);
    await LocalStorage.setItem("improvmx_unix_timestamp", Math.floor(Date.now() / 1000) as number);

    return account.account.email;

  } catch (error) {
    console.log(error);
    
  }
}

const fetchAccont = async (auth: string, API_URL: string ) => {

    const improvmx_email = await LocalStorage.getItem("improvmx_email");
    const improvmx_unix_timestamp = await LocalStorage.getItem("improvmx_unix_timestamp") as number;

    if (improvmx_unix_timestamp && improvmx_email) {
      const current_unix_timestamp = Math.floor(Date.now() / 1000);
      const difference = current_unix_timestamp - improvmx_unix_timestamp;
      const hours = Math.floor(difference / 3600);
      if (hours < 24) {
        return improvmx_email;
      } else {
        return fetchAccountAPI(auth, API_URL)
      }
    } else {
      return fetchAccountAPI(auth, API_URL)
    }
  };

  export { fetchAccont }
