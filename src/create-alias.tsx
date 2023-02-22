import {
  showHUD,
  openExtensionPreferences,
  showToast,
  Detail,
  Toast,
  getPreferenceValues,
  ActionPanel,
  Clipboard,
  Action,
  Form,
} from "@raycast/api";
import fetch from "node-fetch";
import { useEffect, useState } from "react";
import { fetchAccont } from "./utils";

interface Preferences {
  api_token: string;
}
interface Domain {
  display: string;
  banned?: boolean;
  active?: boolean;
}

interface State {
  domains?: Domain[];
  error?: string;
  forwardingEmail?: string;
  aliasError?: string;
  domainError?: string;
  isLoading: false,
  forwardingEmailError: string;
}

export default function createAlias() {
  const [state, setState] = useState<State>({
      domains: undefined,
      error: "",
      forwardingEmail: "",
      aliasError: "", 
      domainError: "",
      forwardingEmailError: "",
      isLoading: false,
    }),
    API_TOKEN = getPreferenceValues<Preferences>().api_token,
    API_URL = "https://api.improvmx.com/v3/";

  const auth = Buffer.from("api:" + API_TOKEN).toString("base64");

  useEffect(() => {
    async function getDomains() {
      try {
        const apiResponse = await fetch(API_URL + "domains?=", {
          headers: {
            Authorization: "Basic " + auth,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        });

        if (!apiResponse.ok) {
          if (apiResponse.status === 401) {
            setState((prevState) => {
              return { ...prevState, error: "Invalid API Token" };
            });

            return;
          }
        }

        const response = (await apiResponse.json()) as unknown;
        const domains = response as { domains: Array<Domain> };

        setState((prevState) => {
          return { ...prevState, domains: domains.domains, error: "" };
        });
      } catch (error) {
        setState((prevState) => {
          return { ...prevState, error: "Failed to fetch domains. Please try again later." };
        });
        return;
      }
    }

    async function forwardingEmailFn() {
      const email = await fetchAccont(auth, API_URL);
      setState({ ...state, forwardingEmail: email });
      setState((prevState) => {
        return { ...prevState, forwardingEmail: email };
      });
    }

    getDomains();
    forwardingEmailFn();
  }, []);

  const showError = async () => {
    if (state.error) {
      await showToast(Toast.Style.Failure, state.error);
    }
  };

  const handleSumbit = async (values : any)  => {
     const { domain, alias } = values;
    const aliasError = alias.length === 0 ? "Alias is required" : "";
    const domainError = domain.length === 0 ? "Domain is required" : "";
    const forwardingEmailError = state.forwardingEmail?.length === 0 ? "Forwarding Email is required" : "";


    if (aliasError || domainError || forwardingEmailError)  {
      setState((prevState) => {
        return { ...prevState, aliasError, domainError, forwardingEmailError };
      });
      showToast(Toast.Style.Failure, "Please fill out all required fields");
      return;
    }

    setState((prevState : any) => {
      return { ...prevState, isLoading: true };
    });

    const formData = {
      "forward": state.forwardingEmail,
      "alias": alias,
    }

    try {

      const apiResponse = await fetch(API_URL + "domains/" + domain + "/aliases", {
        method: "POST",
        headers: {
          Authorization: "Basic " + auth,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      
      if (await !apiResponse.ok) {

        if (apiResponse.status === 401) {
          setState((prevState) => {
            return { ...prevState, error: "Invalid API Token", isLoading: false };
          });

          await showToast(Toast.Style.Failure, "Error", "Invalid API Token");
         
          return;
        }
        
        const response = (await apiResponse.json()) as unknown;
        const errors = response as { errors: { alias: Array<string> } };
        const error = errors.errors.alias[0];

        setState((prevState) => {
          return { ...prevState, error: error, isLoading: false };
        });

        await showToast(Toast.Style.Failure, "Error", error);
        return;
      }
    } catch (error) {
      return;
    }

    await showToast(Toast.Style.Success, "Success", "Alias created successfully " +  alias + "@" + domain);
    await Clipboard.copy(alias + "@" + domain);
    await showHUD("Alias copied to clipboard " + alias + "@" + domain);
    
    
  }

  showError();

  return state.error ? (
    <Detail
      markdown={"⚠️" + state.error}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  ) : (
    <Form isLoading={state.domains === undefined || state.isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Alias" onSubmit={(values) => handleSumbit(values)} />
        </ActionPanel>
      }

    >
      <Form.Dropdown id="domain" title="Domain" placeholder="Select a domain"
        error={state.domainError}
      >
        {state.domains
          ?.filter((domain) => !domain.banned && domain.active)
          .map((domain) => (
            <Form.Dropdown.Item key={domain.display} value={domain.display} title={domain.display} />
          ))}
      </Form.Dropdown>

      <Form.TextField
        id="alias"
        title="Alias"
        placeholder="Enter an alias"
        error={state.aliasError}
      />
      <Form.TextField
        id="forwardingEmail"
        title="Forwarding Email"
        placeholder="Enter a forwarding email"
        value={state.forwardingEmail}
        error={state.forwardingEmailError}
        onChange={(value) => setState({ ...state, forwardingEmail: value })}
      />
    </Form>
  );
}
