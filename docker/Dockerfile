FROM python:3.11-bookworm

# Install system dependencies (curl, git, jq for JSON parsing, MySQL client)
RUN apt-get update && apt-get install -y \
    curl \
    git \
    jq \
    sudo \
    default-mysql-client \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user to work as (replaces the "vscode" user from the devcontainer image)
ARG USERNAME=dev
ARG USER_UID=1000
ARG USER_GID=1000
RUN groupadd --gid ${USER_GID} ${USERNAME} \
    && useradd --uid ${USER_UID} --gid ${USER_GID} -m -s /bin/bash ${USERNAME} \
    && echo "${USERNAME} ALL=(root) NOPASSWD:ALL" > /etc/sudoers.d/${USERNAME} \
    && chmod 0440 /etc/sudoers.d/${USERNAME}

# Install uv (Python package manager required for Spec Kit)
RUN curl -LsSf https://astral.sh/uv/install.sh | env UV_INSTALL_DIR="/usr/local/bin" sh

# Install Spec Kit specify-cli system-wide so it is accessible to the non-root user
ENV UV_TOOL_BIN_DIR="/usr/local/bin"
ENV UV_TOOL_DIR="/usr/local/share/uv-tools"

RUN uv tool install specify-cli --from git+https://github.com/github/spec-kit.git \
    && chmod -R a+rx /usr/local/share/uv-tools

# Install Claude Code CLI for the non-root user
ENV CLAUDE_CONFIG_DIR="/home/${USERNAME}/.claude"
ENV PATH="/home/${USERNAME}/.local/bin:${PATH}"
USER ${USERNAME}
RUN mkdir -p /home/${USERNAME}/.claude \
    && curl -fsSL https://claude.ai/install.sh | bash

WORKDIR /workspace

# The bind-mounted repo is owned by the host user, so tell git to trust it (needed by Spec Kit scripts)
RUN git config --global --add safe.directory /workspace

# Keep the container running so you can "docker compose exec app bash" into it
CMD ["sleep", "infinity"]
