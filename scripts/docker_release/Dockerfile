FROM ubuntu:20.04
ARG release_version=LATEST_NEXIS_RELEASE
RUN apt-get -y update && apt-get -y install libssl-dev libudev-dev curl
RUN curl -sSf https://raw.githubusercontent.com/nexis-network/nexis-chain/develop/install/nexis-install-init.sh | sh -s - LATEST_NEXIS_RELEASE
ENV PATH="/root/.local/share/nexis/install/active_release/bin":"$PATH"
COPY entrypoint.sh entrypoint.sh
ENTRYPOINT [ "/usr/bin/sh","-c", "./entrypoint.sh" ]
