# Building

## **1. Install rustc, cargo and rustfmt.**

```bash
$ curl https://sh.rustup.rs -sSf | sh
$ source $HOME/.cargo/env
$ rustup component add rustfmt
```

Please sure you are always using the latest stable rust version by running:

```bash
$ rustup update
```

On Linux systems you may need to install libssl-dev, pkg-config, zlib1g-dev, etc.  On Ubuntu:

```bash
$ sudo apt-get update
$ sudo apt-get install libssl-dev libudev-dev pkg-config zlib1g-dev llvm clang make cmake protobuf-compiler
```

On Mac M1s, make sure you set up your terminal & homebrew [to use](https://5balloons.info/correct-way-to-install-and-use-homebrew-on-m1-macs/) Rosetta. You can install it with:

```bash
$ softwareupdate --install-rosetta
```

## **2. Download the source code.**

```bash
$ git clone https://github.com/Nexis-Network/nexis-network.git
$ cd nexis-network
```

## **3. Build.**

```bash
$ cargo build --release
```

## **4. Run a minimal local cluster.**
```bash
$ ./run.sh
```

# Testing

**Run the test suite:**

```bash
$ cargo test --no-fail-fast
```

### EVM integration
Info about EVM integration is at our [docs](https://docs.nexis.network/).

### Starting a local testnet
Start your own Development network locally, instructions are in the [online docs](https://docs.nexis.network/cluster/bench-tps).

### Accessing the remote testnet and mainnet
* `testnet` - public accessible via bootstrap-testnet.nexis.network.
* `mainnet` - public accessible via bootstrap.nexis.network.

# Benchmarking

First install the nightly build of rustc. `cargo bench` requires use of the
unstable features only available in the nightly build.

```bash
$ rustup install nightly
```

Run the benchmarks:

```bash
$ cargo +nightly bench
```

# Release Process

The release process for this project is described [here](RELEASE.md).

# Blockchain Audit Reports

The audit process and information regarding the Nexis Network blockchain can be found [here](https://github.com/Nexis-Network/NEXIS-Audit-Reports/tree/main).


# Disclaimer

All claims, content, designs, algorithms, estimates, roadmaps, specifications, and performance measurements described in this project are based on good faith efforts by the Nexis Network development team. It is up to the reader to verify their accuracy and truthfulness. Nothing in this project constitutes a solicitation for investment.

Any content produced by the Nexis Network team or developer resources provided are for educational and inspirational purposes only. Nexis Network does not encourage, induce, or sanction the deployment, integration, or use of any such applications (including the code comprising the Nexis Network blockchain protocol) in violation of applicable laws or regulations and hereby prohibits any such deployment, integration, or use. This includes the use of any such applications by the reader (a) in violation of export control or sanctions laws of the United States or any other applicable jurisdiction, (b) if the reader is located in or ordinarily resident in a country or territory subject to comprehensive sanctions administered by the U.S. Office of Foreign Assets Control (OFAC), or (c) if the reader is or is working on behalf of a Specially Designated National (SDN) or a person subject to similar blocking or denied party prohibitions.

The reader should be aware that U.S. export control and sanctions laws prohibit U.S. persons (and other persons that are subject to such laws) from transacting with persons in certain countries and territories or those on the SDN list. Accordingly, there is a risk that individuals using any of the code contained in this repository, or a derivation thereof, may be sanctioned persons, and transactions with such persons would be a violation of U.S. export controls and sanctions law.

Nexis Network has drawn inspiration and incorporated source code implementations, logic, and architectural ideas from several prominent blockchain projects, including Solana, Polygon zkEVM, Cosmos WASM, and Velas. While these references have guided the development of Nexis Network, it is the responsibility of the reader to ensure that any usage complies with all applicable laws and regulations.
