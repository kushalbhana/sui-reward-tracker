// -----------------------------------------------
// Database entity types (framework-agnostic)
// -----------------------------------------------

export interface IStakingRequestEvent {
  bcs: string;
  cursorId: {
    eventSeq: string;
    txDigest: string;
  };
  sortedId?: number;
  packageId: string;
  parsedJson: {
    amount: string;
    epoch: number;
    poolId: string;
    stakerAddress: string;
    validatorAddress: string;
  };
  sender: string;
  timestampMs: string;
  transactionModule: string;
  type: string;
}

export interface IUnstakingRequestEvent {
  bcs: string;
  cursorId: {
    txDigest: string;
    eventSeq: string;
  };
  sortedId?: number;
  packageId: string;
  parsedJson: {
    poolId: string;
    principalAmount: string;
    rewardAmount: string;
    stakeActivationEpoch: string;
    stakerAddress: string;
    unstakingEpoch: number;
    validatorAddress: string;
  };
  sender: string;
  timestampMs: string;
  transactionModule: string;
  type: string;
}

export interface IValidatorEpochInfoEvent {
  bcs: string;
  cursorId: {
    txDigest: string;
    eventSeq: string;
  };
  sortedId?: number;
  packageId: string;
  parsedJson: {
    epoch: string;
    validator_address: string;
    reference_gas_survey_quote: string;
    stake: string;
    voting_power: string;
    commission_rate: string;
    pool_staking_reward: string;
    storage_fund_staking_reward: string;
    pool_token_exchange_rate: {
      sui_amount: string;
      pool_token_amount: string;
    };
    tallying_rule_reporters: string[];
    tallying_rule_global_score: string;
  };
  sender: string;
  timestampMs: string;
  transactionModule: string;
  type: string;
}
