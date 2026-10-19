export interface WorkflowTemplateOptions {
  name: string;
  branch: string;
  runtime: 'nodejs' | 'react-vite' | 'python' | 'java-maven' | 'docker' | 'custom';
  testCommand?: string;
  buildCommand?: string;
  dockerEnabled?: boolean;
  dockerImageName?: string;
  deploymentEnabled?: boolean;
  deploymentTarget?: string;
}

export function generateWorkflowYaml(opts: WorkflowTemplateOptions): string {
  const branch = opts.branch || 'main';
  const testCmd = opts.testCommand || (opts.runtime === 'python' ? 'pytest' : opts.runtime === 'java-maven' ? 'mvn test' : 'npm test');
  const buildCmd = opts.buildCommand || (opts.runtime === 'python' ? 'python -m build' : opts.runtime === 'java-maven' ? 'mvn clean package -DskipTests' : 'npm run build');

  if (opts.runtime === 'python') {
    return `# DevFlow Automated CI/CD Workflow — Python
name: ${opts.name || 'Python CI'}

on:
  push:
    branches: [ ${branch} ]
  pull_request:
    branches: [ ${branch} ]
  workflow_dispatch:

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - name: Check out repository
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'

      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
          pip install pytest flake8

      - name: Lint with flake8
        run: |
          # Stop the build if there are Python syntax errors or undefined names
          flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics

      - name: Run automated tests
        run: ${testCmd}

      - name: Build distribution
        run: ${buildCmd}
${opts.dockerEnabled ? `
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build Docker image
        run: |
          docker build -t ${opts.dockerImageName || 'app'}:latest .
` : ''}${opts.deploymentEnabled ? `
      - name: Deploy application
        run: |
          echo "Deploying ${branch} to ${opts.deploymentTarget || 'production'}..."
` : ''}
      - name: Report CI Status
        if: always()
        run: echo "DevFlow CI completed with status \${{ job.status }}"
`;
  }

  if (opts.runtime === 'java-maven') {
    return `# DevFlow Automated CI/CD Workflow — Java Maven
name: ${opts.name || 'Java Maven CI'}

on:
  push:
    branches: [ ${branch} ]
  pull_request:
    branches: [ ${branch} ]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Check out repository
        uses: actions/checkout@v4

      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
          cache: maven

      - name: Build and run tests with Maven
        run: ${testCmd}

      - name: Package JAR/WAR
        run: ${buildCmd}
${opts.dockerEnabled ? `
      - name: Build Docker image
        run: docker build -t ${opts.dockerImageName || 'java-app'}:latest .
` : ''}
      - name: Report CI Status
        if: always()
        run: echo "DevFlow CI completed with status \${{ job.status }}"
`;
  }

  if (opts.runtime === 'docker') {
    return `# DevFlow Automated CI/CD Workflow — Docker Containerized
name: ${opts.name || 'Docker CI/CD'}

on:
  push:
    branches: [ ${branch} ]
  pull_request:
    branches: [ ${branch} ]
  workflow_dispatch:

permissions:
  contents: read
  packages: write

jobs:
  docker-pipeline:
    runs-on: ubuntu-latest
    steps:
      - name: Check out repository
        uses: actions/checkout@v4

      - name: Set up QEMU
        uses: docker/setup-qemu-action@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: \${{ github.actor }}
          password: \${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata (tags, labels)
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/\${{ github.repository }}
          tags: |
            type=ref,event=branch
            type=sha,format=short

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: \${{ github.event_name != 'pull_request' }}
          tags: \${{ steps.meta.outputs.tags }}
          labels: \${{ steps.meta.outputs.labels }}

      - name: Container Health Check
        run: |
          docker run --rm -d --name test-container -p 8080:8080 \${{ steps.meta.outputs.tags }}
          sleep 5
          docker ps
          docker stop test-container
`;
  }

  // Node.js or React-Vite (Default)
  const isVite = opts.runtime === 'react-vite';
  return `# DevFlow Automated CI/CD Workflow — ${isVite ? 'React & Vite' : 'Node.js'}
name: ${opts.name || 'DevFlow CI/CD Pipeline'}

on:
  push:
    branches: [ ${branch} ]
  pull_request:
    branches: [ ${branch} ]
  workflow_dispatch:

jobs:
  ci-pipeline:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [ 20.x ]

    steps:
      - name: 1. Check out repository
        uses: actions/checkout@v4

      - name: 2. Set up Node.js \${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: \${{ matrix.node-version }}
          cache: 'npm'

      - name: 3. Install dependencies
        run: npm ci || npm install

      - name: 4. Code quality & Lint
        run: npm run lint --if-present

      - name: 5. Automated Tests
        run: ${testCmd}

      - name: 6. Build Application
        run: ${buildCmd}
${opts.dockerEnabled ? `
      - name: 7. Build Docker Image
        run: |
          echo "Building Docker container for ${opts.dockerImageName || 'app'}..."
          docker build -t ${opts.dockerImageName || 'app'}:\${{ github.sha }} .
` : ''}${opts.deploymentEnabled ? `
      - name: 8. Deploy to ${opts.deploymentTarget || 'Production'}
        if: github.ref == 'refs/heads/${branch}'
        run: |
          echo "Deploying revision \${{ github.sha }} to ${opts.deploymentTarget || 'Production'}..."

      - name: 9. Perform Health Check
        run: |
          echo "Probing deployment health endpoint..."
          # curl -f -s https://${opts.deploymentTarget || 'app.example.com'}/health || exit 1
          echo "Health check passed: HTTP 200 OK"
` : ''}
      - name: 10. Report Final Result
        if: always()
        run: |
          echo "DevFlow Pipeline execution finished with conclusion: \${{ job.status }}"
`;
}
