import { ActionPanel, Form, Action, Toast, getPreferenceValues, popToRoot, showToast } from "@raycast/api";
import fetch from "node-fetch";
import { useState } from "react";

interface Preferences {
  api_token: string;
}

interface State {
  domain?: string;
  isValid?: boolean;
  isLoading?: boolean;
  error: string;
}

export default function AddDomain() {
  const [state, setState] = useState<State>({
    domain: undefined,
    isValid: false,
    isLoading: false,
    error: "",
  });

  const [domain, setDomain] = useState("");
  const [isValid, setIsValid] = useState(true);

  const API_TOKEN = getPreferenceValues<Preferences>().api_token;

  const API_URL = "https://api.improvmx.com/v3/";

  const auth = Buffer.from("api:" + API_TOKEN).toString("base64");
  const DOMAIN_REGEX = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;

  const handleDomainChange = (newDomain: string) => {
    if (newDomain.length > 0) {
      setIsValid(DOMAIN_REGEX.test(newDomain));
      setDomain(newDomain);
    }
  };

  const handleSubmit = async () => {
    if (isValid) {
      setState((prevState) => {
        return { ...prevState, isLoading: true };
      });

      try {
        const apiResponse = await fetch(API_URL + "domains", {
          method: "POST",
          headers: {
            Authorization: "Basic " + auth,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            domain: domain,
          }),
        });

        if (await !apiResponse.ok) {
          if (apiResponse.status === 401) {
            setState((prevState) => {
              return { ...prevState, error: "Invalid API Token", isLoading: false };
            });
            await showToast(Toast.Style.Failure, "Error", "Invalid API Token");
            setDomain("");
            setTimeout(() => {
              popToRoot({ clearSearchBar: true });
            }, 2000);
            return;
          }

          const response = (await apiResponse.json()) as unknown;
          const errors = response as { errors: { domain: Array<string> } };
          const error = errors.errors.domain[0];

          setState((prevState) => {
            return { ...prevState, error: error, isLoading: false };
          });
          await showToast(Toast.Style.Failure, "Error", error);
          setDomain("");
          setTimeout(() => {
            popToRoot({ clearSearchBar: true });
          }, 2000);
          
          return;
        }
      } catch (error) {
        return;
      }

      setState((prevState) => {
        return { ...prevState, isLoading: false };
      });
      await showToast(Toast.Style.Success, "Domain Added", "Domain added successfully to your ImprovMX account.");
      setDomain("");
      setTimeout(() => {
        popToRoot({ clearSearchBar: true });
      }, 2000);
    }
  };

  return (
    <Form
      enableDrafts
      isLoading={state.isLoading}
      actions={
        <ActionPanel>
          <Action
            title="Submit"
            onAction={() => {
              handleSubmit();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="domain"
        autoFocus
        info="Enter a domain to add to your ImprovMX account."
        error={isValid ? undefined : "Invalid domain"}
        title="Domain"
        placeholder="example.com"
        value={domain}
        onChange={handleDomainChange}
      />
    </Form>
  );
}
