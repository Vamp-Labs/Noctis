// ─── Employee Salary History ──────────────────────────────────────
export const GET_EMPLOYEE_SALARY_HISTORY = `
  query EmployeeSalaryHistory($address: String!) {
    paymentsToPublicKey(publicKeyText: $address) {
      nodes {
        amount
        assetByAsset { code issuer }
        txInfoByTx {
          txHash
          fee
          ledgerByLedger { sequence closeTime }
          opCount
        }
        accountBySource { publickey }
        accountByDestination { publickey }
      }
    }
  }
`;

// ─── Employer Active Streams ──────────────────────────────────────
export const GET_EMPLOYER_STREAMS = `
  query EmployerStreams($employer: String!) {
    paymentsByPublicKey(publicKeyText: $employer) {
      nodes {
        amount
        assetByAsset { code issuer }
        assetNative
        txInfoByTx {
          txHash
          fee
          ledgerByLedger { sequence closeTime }
        }
        accountByDestination { publickey }
      }
    }
  }
`;

// ─── Yield Event History ─────────────────────────────────────────
export const GET_YIELD_EVENTS = `
  query YieldEvents($contractId: String!) {
    allZephyrYieldEvents(contractId: $contractId) {
      edges {
        node {
          eventType
          amount
          timestamp
          txHash
        }
      }
    }
  }
`;

// ─── Contract Event Subscription Template ─────────────────────────
// Replace CONTRACT_ID and EVENT_TOPIC with actual values after
// Mercury subscription setup in the dashboard.
export const GET_CONTRACT_EVENTS = `
  query ContractEvents($contractId: String!, $eventTopic: String!) {
    contractEvents(
      contractId: $contractId
      eventTopic: $eventTopic
      first: 50
    ) {
      edges {
        node {
          topic
          value
          ledger
          txHash
        }
      }
    }
  }
`;

// ─── Stream Creation Events ───────────────────────────────────────
export const GET_STREAM_CREATION_EVENTS = `
  query StreamCreationEvents($vaultContract: String!) {
    allZephyrStreamEvents(contractId: $vaultContract) {
      edges {
        node {
          streamId
          employer
          employee
          amount
          timestamp
        }
      }
    }
  }
`;

// ─── Account Balances Query (Mercury Classic) ─────────────────────
export const GET_ACCOUNT_BALANCES = `
  query AccountBalances($address: String!) {
    balanceByPublicKey(publicKeyText: $address) {
      nodes {
        assetByAsset { code issuer }
        balance
        sellingLiabilities
        buyingLiabilities
      }
    }
  }
`;
