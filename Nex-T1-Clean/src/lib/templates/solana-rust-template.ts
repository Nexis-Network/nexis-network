import { VirtualFile } from "@/types/build";

export const SOLANA_RUST_TEMPLATE: VirtualFile[] = [
  {
    id: "Cargo.toml",
    name: "Cargo.toml",
    type: "file",
    content: `[workspace]
members = ["programs/nex_counter"]
resolver = "2"

[workspace.dependencies]
borsh = { version = "1.5.1", features = ["derive"] }
solana-program = "2.0.13"
thiserror = "1.0.63"
`,
    language: "toml",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "programs/nex_counter/Cargo.toml",
    name: "programs/nex_counter/Cargo.toml",
    type: "file",
    content: `[package]
name = "nex_counter"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "lib"]

[features]
no-entrypoint = []

[dependencies]
borsh.workspace = true
solana-program.workspace = true
thiserror.workspace = true
`,
    language: "toml",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "programs/nex_counter/src/lib.rs",
    name: "programs/nex_counter/src/lib.rs",
    type: "file",
    content: `pub mod error;
pub mod instruction;
pub mod processor;
pub mod state;

use solana_program::{
    account_info::AccountInfo,
    entrypoint,
    entrypoint::ProgramResult,
    pubkey::Pubkey,
};

entrypoint!(process_instruction);

fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    input: &[u8],
) -> ProgramResult {
    processor::process_instruction(program_id, accounts, input)
}
`,
    language: "rust",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "programs/nex_counter/src/error.rs",
    name: "programs/nex_counter/src/error.rs",
    type: "file",
    content: `use solana_program::program_error::ProgramError;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum NexCounterError {
    #[error("Account already initialized")]
    AlreadyInitialized,
    #[error("Account is not initialized")]
    NotInitialized,
    #[error("Invalid account owner")]
    InvalidOwner,
    #[error("Counter overflow")]
    Overflow,
}

impl From<NexCounterError> for ProgramError {
    fn from(error: NexCounterError) -> Self {
        ProgramError::Custom(error as u32)
    }
}
`,
    language: "rust",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "programs/nex_counter/src/instruction.rs",
    name: "programs/nex_counter/src/instruction.rs",
    type: "file",
    content: `use borsh::{BorshDeserialize, BorshSerialize};

#[derive(BorshDeserialize, BorshSerialize, Debug, Clone)]
pub enum NexCounterInstruction {
    Initialize { start: u64 },
    Increment,
}
`,
    language: "rust",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "programs/nex_counter/src/state.rs",
    name: "programs/nex_counter/src/state.rs",
    type: "file",
    content: `use borsh::{BorshDeserialize, BorshSerialize};

#[derive(BorshDeserialize, BorshSerialize, Debug, Clone, Default)]
pub struct CounterState {
    pub initialized: bool,
    pub value: u64,
}
`,
    language: "rust",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "programs/nex_counter/src/processor.rs",
    name: "programs/nex_counter/src/processor.rs",
    type: "file",
    content: `use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::AccountInfo,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
};

use crate::{
    error::NexCounterError,
    instruction::NexCounterInstruction,
    state::CounterState,
};

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    input: &[u8],
) -> ProgramResult {
    let [counter_account, _rest @ ..] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };

    if counter_account.owner != program_id {
        return Err(NexCounterError::InvalidOwner.into());
    }

    let instruction = NexCounterInstruction::try_from_slice(input)
        .map_err(|_| ProgramError::InvalidInstructionData)?;

    let mut data = counter_account.try_borrow_mut_data()?;
    let mut state = CounterState::try_from_slice(&data).unwrap_or_default();

    match instruction {
        NexCounterInstruction::Initialize { start } => {
            if state.initialized {
                return Err(NexCounterError::AlreadyInitialized.into());
            }
            state.initialized = true;
            state.value = start;
            msg!("Counter initialized: {}", start);
        }
        NexCounterInstruction::Increment => {
            if !state.initialized {
                return Err(NexCounterError::NotInitialized.into());
            }
            state.value = state
                .value
                .checked_add(1)
                .ok_or(NexCounterError::Overflow)?;
            msg!("Counter incremented: {}", state.value);
        }
    }

    state.serialize(&mut data.as_mut())?;
    Ok(())
}
`,
    language: "rust",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "README.md",
    name: "README.md",
    type: "file",
    content: `# Solana Rust Sandbox Template

This template is a native Solana Rust workspace with a sample counter program.

## Commands

- \`cargo check --workspace\`
- \`cargo test --workspace\`
- \`cargo build --workspace\`

## Structure

- \`programs/nex_counter/src/lib.rs\` entrypoint
- \`programs/nex_counter/src/instruction.rs\` instruction enum
- \`programs/nex_counter/src/processor.rs\` instruction processor
- \`programs/nex_counter/src/state.rs\` account state
`,
    language: "markdown",
    updatedAt: new Date().toISOString(),
  },
];
