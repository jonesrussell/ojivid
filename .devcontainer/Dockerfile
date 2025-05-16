ARG VARIANT=1.24-bullseye
FROM mcr.microsoft.com/devcontainers/go:${VARIANT}

# Install GTK, WebKit, and X11 dependencies for WSL2
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    libgtk-3-dev \
    libwebkit2gtk-4.0-dev \
    build-essential \
    pkg-config \
    x11-apps \
    x11-utils \
    x11-xserver-utils \
    libx11-dev \
    libxrandr-dev \
    libxinerama-dev \
    libxcursor-dev \
    libxi-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set display for WSL2
ENV DISPLAY=:0

# [Optional] Uncomment this section to install additional OS packages.
# RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
#     && apt-get -y install --no-install-recommends <your-package-list-here>

# [Optional] Uncomment the next lines to use go get to install anything else you need
USER vscode

RUN go install github.com/golangci/golangci-lint/v2/cmd/golangci-lint@latest

USER root

# [Optional] Uncomment this line to install global node packages.
# RUN su vscode -c "source /usr/local/share/nvm/nvm.sh && npm install -g <your-package-here>" 2>&1
