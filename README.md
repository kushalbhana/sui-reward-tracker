# Sui Rewards Tracker

**Sui Rewards Tracker** is a platform where you can check delegator rewards for epochs on the Sui blockchain. You can easily browse all the validators, their delegators, and the associated rewards they receive using this platform.

## Features

- **Validator Overview**: Check all active validators on the Sui network.
- **Delegator Analytics**: View detailed lists of delegators for each validator and their corresponding rewards.
- **Epoch Tracking**: Access and track delegator rewards specifically tied to various epochs on Sui.

## Project Structure

This project is organized as a monorepo via [Turborepo](https://turbo.build/repo/docs) and uses **npm** as its package manager.

### Apps

- `apps/web`: The main web application (built with [Next.js](https://nextjs.org/)).
- `apps/docs`: Documentation site for the platform (built with [Next.js](https://nextjs.org/)).

### Packages

- `packages/ui`: A stub React component library shared by both `web` and `docs` applications.
- `packages/eslint-config`: Shared `eslint` configurations (`eslint-config-next` and `eslint-config-prettier`).
- `packages/typescript-config`: Shared `tsconfig.json` configurations used throughout the monorepo.

## Prerequisites

Ensure you have the following installed to run this project:
- [Node.js](https://nodejs.org/) (v18 or newer recommended based on engine specifications)
- `npm` (v10.9.4 or newer recommended as the main package manager)

## Getting Started

Follow these steps to get the platform up and running on your local machine:

1. **Install Dependencies:**
   Run the following command in the root directory to install all necessary packages across the apps:
   ```sh
   npm install
   ```

2. **Run the Development Server:**
   To spin up all applications (`web` and `docs`) simultaneously, run:
   ```sh
   npm run dev
   ```
   Or explicitly using turbo:
   ```sh
   npx turbo run dev
   ```

   _The web app will typically be accessible at `http://localhost:3000`._

## Build and Code Quality Commands

This monorepo comes with preconfigured scripts mapped down to turbo:

- **Build all apps and packages**:
  ```sh
  npm run build
  ```
- **Run linting across the monorepo**:
  ```sh
  npm run lint
  ```
- **Check TypeScript types**:
  ```sh
  npm run check-types
  ```
- **Format code using Prettier**:
  ```sh
  npm run format
  ```

## Remote Caching (Turborepo)

Turborepo can use a technique known as [Remote Caching](https://turborepo.dev/docs/core-concepts/remote-caching) to share cache artifacts across machines. By default, it caches locally. To enable Remote Caching from the root, you can optionally run `npx turbo login` and then link your Turborepo by running `npx turbo link`.
