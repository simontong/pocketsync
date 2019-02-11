# PocketSync

Synchronize bank transactions between PocketSmith, FreeAgent and Revolut Business (more coming soon).

- [Getting Started](#getting-started)
- [Provider Configuration](#provider-configuration)
  - [PocketSmith](#provider-pocketsmith)
  - [FreeAgent](#provider-freeagent)
  - [Revolut Business](#provider-revolut-business)
- [Synchronizing](#synchronizing)
  - [Creating a Sync Profile](#creating-a-sync-profile)
  - [Running a Sync Profile](#running-a-sync-profile)
- [Execute API commands](#execute-api-commands)
- [Configuring Multiple Users for Single Provider](#configuring-multiple-users-for-single-provider)
- [Changelog](#changelog)
- [License](#license)

<a name="getting-started"></a>

## Getting Started

Clone repository and cd into pocketsync:

```bash
git clone git@github.com:simontong/pocketsync.git
cd pocketsync
```

Install packages:

```bash
yarn install
```

Copy `.env.example` to `.env` and modify to your environment preferences.

Run database migrations:

```bash
yarn km up
```

<a name="provider-configuration"></a>

## Provider Configuration

Before you can create any sync profiles, you need to configure a provider, see below.

<a name="provider-pocketsmith"></a>

### PocketSmith

If you don't have a PocketSmith account you can create one for free here: [Get your free account now](https://my.pocketsmith.com/signup/Free).

Login and create a new key here: [Manage developer keys](https://my.pocketsmith.com/security/manage_keys).

Copy the newly created key to clipboard.

Run the command below and paste new key (`accessToken`).

```bash
node . config PocketSmith -s accessToken
```

Check that the key works.

```bash
node . api PocketSmith fetchMe
```

If it worked you should see your user information as follows:

```
{
  id: 12345,
  login: 'john@smith.com',
  name: 'John Smith',
  email: 'john@smith.com',
  ...
}
```

<a name="provider-freeagent"></a>

### FreeAgent

If you don't have a FreeAgent developer account, create one at [Sign up for you Developer Dashboard account](https://dev.FreeAgent.com/signup).

Login and create a new app here: [Create a new app](https://dev.FreeAgent.com/apps/new).

After creating a new app you'll be presented with a page that contains your `OAuth identifier` and `OAuth secret`. You'll need these for the next step.

Go to [Google's OAuth 2.0 Playground](https://code.google.com/oauthplayground/#step3&url=https%3A//&content_type=application/json&http_method=GET&useDefaultOauthCred=unchecked&oauthEndpointSelect=Custom&oauthAuthEndpointValue=https%3A//api.FreeAgent.com/v2/approve_app&oauthTokenEndpointValue=https%3A//api.FreeAgent.com/v2/token_endpoint&includeCredentials=unchecked).

Click the cog to open up OAuth Configuration Settings.

Enter your `OAuth identifier` and `OAuth secret` into the _OAuth Client ID_ and _OAuth Client Secret_ fields.

Expand 'Step 1 Select & authorize APIs' section.

In scopes, at the bottom of 'Step 1 Select & authorize APIs' (left of _Authorize APIs_ button), input any value (i.e 'helloworld') and click _Authorize APIs_.

When asked, enter your login details and then Approve the app. You'll be redirected back to Google's OAuth 2.0 Playground.

Click _Exchange authorization code for tokens_.

Add `OAuth identifier`, `OAuth secret` (from FreeAgent create app page), `Refresh token` and `Access token` to PocketSync (you'll be prompted to enter them).

Run the command below:

```bash
node . config FreeAgent -s identifier -s secret -s accessToken -s refreshToken
```

Check everything worked:

```bash
node . api FreeAgent fetchUser
```

If it worked you should see your user information like so:

```
{
  user: {
    url: 'https://api.FreeAgent.com/v2/users/1234567890',
    first_name: 'John',
    last_name: 'Smith',
    email: 'john@smith.com',
    ...
  }
}
```

<a name="provider-revolut-business"></a>

### Revolut Business

If you don't have a Revolut Business account register at [Sign up your business to Revolut](https://business.revolut.com/signup).

Login and get your access token here: [API Keys](https://business.revolut.com/settings/api).

Copy the newly created key to clipboard.

Run the command below and paste new key (`accessToken`).

```bash
node . config RevolutBusiness -s accessToken
```

Check that the key works:

```bash
node . api RevolutBusiness fetchAccounts
```

If it worked you should see your account information like so:

```
[
  {
    id: 'xxxxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    name: 'Main EUR',
    balance: 10000.73,
    currency: 'EUR',
    state: 'active',
    public: true,
    created_at: '2017-09-26T13:42:02.136Z',
    updated_at: '2019-02-01T11:06:40.636Z'
  },
  {
    id: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    name: 'Current USD',
    balance: 2000.21,
    currency: 'USD',
    state: 'active',
    public: true,
    created_at: '2018-09-26T13:42:02.136Z',
    updated_at: '2018-02-08T02:16:58.966Z'
  },
  ...
]
```

<a name="synchronizing"></a>

## Synchronizing

In order to sync between providers you need to set up sync profiles. Below are instructions on how to go about this.

Note: you must have at least one provider set up in order to sync (see [Provider Configuration](#provider-configuration) for instructions).

<a name="creating-a-sync-profile"></a>

### Creating a Sync Profile

Run the following command to create a sync profile:

```bash
node . create-sync
```

Select a source provider and target provider.

Select a source account and target account.

Name your sync profile. This should be something memorable so that you can execute the profile later. Alternatively, you can leave the default.

<a name="running-a-sync-profile"></a>

### Running a Sync Profile

Execute a dry-run of your newly created sync profile (this won't make any changes to your target provider):

```bash
node . sync -d
```

Select one of your existing sync profiles to dry-run.

PocketSync will output the resulting source transactions that would have been uploaded to the target account.

If you're happy with the dry-run then you can proceed with a live sync.

```bash
node . sync
```

You can run sync profiles unattended by passing the `--unattended` flag like so:

```
node . sync --unattended [sync profile name]
```

It's also possible to run all your sync profiles at once by executing the following:

```bash
node . sync --run-all
```

<a name="execute-api-commands"></a>

## Execute API commands

After you have configured a provider (see [Provider Configuration](#provider-configuration) for instructions) you can execute commands against an API.

To see a list of available commands for a provider enter the `-l` flag like so:

```bash
node . api FreeAgent -l
```

Sometimes you'll see `params` in a command with curly brackets (eg. `fetchTransactions (params: {perPage=1000, from, to, counterParty, type})`). This means
you need to enter the arguments as a form of JSON (using [dirty-json](https://www.npmjs.com/package/dirty-json), a JSON parser that tries to handle non-conforming or otherwise invalid JSON).

For example:

```bash
node . api FreeAgent fetchTransactions '{perPage: 10, from: "2019-01-01"}'
```

In most cases params can be entered as separate arguments (such as for commands like `fetchAccounts (params: userId)`):

```bash
node . api PocketSmith fetchAccounts 12345
```

<a name="configuring-multiple-users-for-single-provider"></a>

## Configuring Multiple Users for a Single Provider

Note: The default user is `pocketsync` which will be used if the `-u` flag is omitted from commands.

If you own multiple provider login accounts and wish to use them you can create a separate user for each, within PocketSync.

Create a new user:

```bash
node . user -c johnsmith
```

Now you can execute commands by entering the `-u johnsmith` flag.

Examples:

Configure a provider:

```bash
node . -u johnsmith config PocketSmith -s accessToken
```

Execute API command:

```bash
node . -u johnsmith api PocketSmith fetchMe
```

Create sync profile:

```bash
node . -u johnsmith create-sync
```

<a name="changelog"></a>

## Changelog

### 1.1.0

> #### Changed
>
> - Refactored download accounts/transactions to abstract away duplicate code and make provider interface simpler.
> - Updated tests to reflect refactorings.

### 1.0.0

> #### Added
>
> - Initial code.

<a name="license"></a>

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details
