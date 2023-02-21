import { showHUD, Icon, openExtensionPreferences, Color, showToast, Detail, Toast, getPreferenceValues, List, ActionPanel, Clipboard, Action } from "@raycast/api";
import fetch, { FormData } from "node-fetch";
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
}


export default function Command() {

  const [state, setState] = useState<State>({
    domains: undefined,
    error: "",
    forwardingEmail: "",
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
            setState(prevState => {
              return {...prevState,  error: "Invalid API Token" };
            });

            return;
          }
        }
    
        const response = await apiResponse.json() as unknown;
        const domains = response as { domains: Array<Domain> };
    
        setState(prevState => {
          return {...prevState,  domains: domains.domains, error: ""};
        });
      } catch (error) {
        setState(prevState => {
          return {...prevState,  error: "Failed to fetch domains. Please try again later." };
        })
        return;
      }
    }

    async function forwardingEmailFn () {
      const email = await fetchAccont(auth, API_URL)
      setState({ ...state, forwardingEmail: email });
      setState(prevState => {
        return {...prevState,  forwardingEmail: email };
      });
    }

    getDomains()
    forwardingEmailFn();
  }, []); 


  const showError = async () => {
    if (state.error) {
      await showToast(Toast.Style.Failure, state.error);
    }
  };



  const domainIcon = (domain: Domain) => {
      if (domain.banned || domain.active == false) {
        return { source: Icon.ExclamationMark, tintColor: Color.Red };
      } else {
        return { source: Icon.CheckCircle, tintColor: Color.Green };
      }
  };

  showError();

return (
  state.error ? (
    <Detail
    markdown="There was an error with your API Token. Please check that your API Token is correct and up-to-date. You can find your API Token in your [Improvmx Dashboard](https://improvmx.com/dashboard). If you need help, please contact support@improvmx.com."
    actions={
      <ActionPanel>
        <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
      </ActionPanel>
    }
     
  />
  ) : (

    <List isLoading={state.domains === undefined} searchBarPlaceholder="Search for domain..." isShowingDetail>
      <List.Section title="Domains">
        {state.domains?.map((domain: Domain) => (
          <List.Item
          key={domain.display}
          title={domain.display}
          icon={domainIcon(domain)}
          actions={
            <ActionPanel>
                <Action
                  title="Create a Masked Email Address"
                  onAction={() => {
                    
                    if (domain.banned || domain.active == false) {
                      showToast(Toast.Style.Failure, "Domain is banned or inactive");
                      return;
                    }
                    
                    const form = new FormData();
                    form.append(
                      "alias",
                      Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
                      );

                      form.append("forward", state.forwardingEmail);
                      
                      fetch(API_URL + `domains/${domain.display}/aliases/`, {
                        method: "POST",
                        headers: {
                          Authorization: "Basic " + auth,
                        },
                        body: form,
                      })
                      .then((response) => response.json())
                      .then(async (data : any ) => {
                        await Clipboard.copy(data.alias.alias + "@" + domain.display);
                        await showHUD("Masked email created successfully " + data.alias.alias + "@" + domain.display + " and copied to clipboard");
                        
                      })
                      .catch(async (error) => {
                        await showToast({
                          style: Toast.Style.Failure,
                          title: error.message,
                        })
                      });
                    }}
                    />
              </ActionPanel>
            }
            detail={<List.Item.Detail markdown={"Create masked email using **" + domain.display + "**"} />}
            />
            ))}
      </List.Section>
    </List>
    )
  );
}
