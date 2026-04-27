# updatable_webring_template
MVP for a 'webring' - structured set of links to other (scientific) data - which can be updated (new content added + site rebuilt) via some external source (in this case, google sheets). Basically, it's a static site with a google sheets CMS.


## Warnings:
- This assumes your spreadsheet is viewable by anyone with the link - I've structured it this way because I don't care too much about the contents of the spreadsheet. If this is important to you, set up a Google cloud service worker and use that (and keep the spreadsheet private).
- Keep the spreadsheet view-only with link, otherwise users could spam the update button.

## Instructions:

1. Create a fine-grained PAT (scoped ONLY to your repo) that actions read/write permissions.
2. Add this script to an AppScript file associated with your google sheets, where GITHUB_TOKEN is the PAT you just generated
```AppScript
function triggerGithubAction() {
  // NB: this is a token scoped only for R/W of the actions of the given repo
  // i.e it can only trigger actions
  const GITHUB_TOKEN = "foo";
  const REPO_OWNER = "your_username";
  const REPO_NAME = "your_repo";
  const WORKFLOW_ID = "workflow_name.yml";   // or the numeric workflow ID
  const BRANCH = "main";            // must exist in the repo

  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/workflows/${WORKFLOW_ID}/dispatches`;

  const payload = {
    ref: BRANCH
  };

  const options = {
    method: "post",
    contentType: "application/json",
    headers: {
      Authorization: "token " + GITHUB_TOKEN,
      Accept: "application/vnd.github+json"
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);

  Logger.log(response.getResponseCode());
  Logger.log(response.getContentText());
}
```
3. Add some button / way of running the script to your spreadsheet - typically this is `Insert Drawing>*draw something*>Assign Script`
4. Trigger the workflow by editing the spreadsheet and pressing the button - this should trigger a gihtuh action that, if it passes, should open a Pull Request into the repo
5. Merge the pull request to triger the Build and Deploy acitons - if they pass, the changes should be live!



## Local install:


1. install `nvm` & `yarn`

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
nvm install 24
npm install --global yarn
```

2. install packages from root directory:

```bash
yarn install
```

3. run frontend

```bash
cd src/
yarn start
```


To run spreadsheet download & parsing locally,
```bash
yarn tsx scripts/parseSheet.ts GOOGLE_SHEET_URL
```