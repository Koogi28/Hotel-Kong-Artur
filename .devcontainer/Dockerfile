FROM mcr.microsoft.com/devcontainers/python:3.11-bookworm

# Install system dependencies (curl, git, jq for JSON parsing, MySQL client)
RUN apt-get update && apt-get install -y \
    curl \
    git \
    jq \
    default-mysql-client \
    && rm -rf /var/lib/apt/lists/*

# Install uv (Python package manager required for Spec Kit)
RUN curl -LsSf https://astral.sh/uv/install.sh | env UV_INSTALL_DIR="/usr/local/bin" sh

# Install Spec Kit specify-cli system-wide so it is accessible to non-root user (vscode)
ENV UV_TOOL_BIN_DIR="/usr/local/bin"
ENV UV_TOOL_DIR="/usr/local/share/uv-tools"

RUN uv tool install specify-cli --from git+https://github.com/github/spec-kit.git \
    && chmod -R a+rx /usr/local/share/uv-tools

# Install Claude Code CLI for the non-root user (vscode)
ENV CLAUDE_CONFIG_DIR="/home/vscode/.claude"
ENV PATH="/home/vscode/.local/bin:${PATH}"
USER vscode
RUN mkdir -p /home/vscode/.claude \
    && curl -fsSL https://claude.ai/install.sh | bash
USER root
