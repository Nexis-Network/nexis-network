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

