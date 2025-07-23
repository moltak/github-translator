# Variables
NODE_MODULES = node_modules
DIST = dist

# Default target
all: install build

# Install dependencies
install: $(NODE_MODULES)

$(NODE_MODULES): package.json
	npm install
	touch $(NODE_MODULES)

# Build the project
build: clean
	npm run build

# Clean the build artifacts
clean:
	rm -rf $(DIST)

.PHONY: all install build clean
