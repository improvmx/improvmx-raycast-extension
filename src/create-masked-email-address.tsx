import { showHUD, showToast, Toast, getPreferenceValues, List, ActionPanel, Clipboard, Action } from "@raycast/api";
import fetch, { FormData } from "node-fetch";
import { useEffect, useState } from "react";

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
  error?: Error;
}

export default function Command() {
  const [state, setState] = useState<State>({}),
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
          throw new Error(`Fetch failed with status ${apiResponse.status}: ${apiResponse.statusText}`);
        }

        const response = await apiResponse.json() as unknown;
        const domains = response as { domains: Array<Domain> };

        setState({ domains: domains.domains });

      } catch (error) {
        setState({
          error: error instanceof Error ? error : new Error("Something went wrong"),
        });
      }
    }

    getDomains();
  }, []);

return (
    <List isLoading={state.domains === undefined} searchBarPlaceholder="Filter domains..." isShowingDetail>
      <List.Section title="Domains">
        {state.domains?.map((domain: Domain) => (
          <List.Item
            key={domain.display}
            title={domain.display}
            icon={{ value: domain.banned || domain.active == false ? "🔴" : "🟢", source: "emoji" }}
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
                    form.append("forward", "muhaddisshah@gmail.com");

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
                        await showHUD("Masked email created successfully " + data.alias.alias + "@" + domain.domain + " and copied to clipboard");

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
  );
}
