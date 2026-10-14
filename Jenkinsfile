// CI gate untuk skeleton & semua project client turunannya.
// Verifikasi: install (frozen lockfile) → lint → format → typecheck → build.
// Node 22 (lihat .nvmrc) + yarn 1.22 harus tersedia di agent.
pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
  }

  environment {
    CI = 'true'
    // Cache yarn per-workspace supaya build berulang cepat
    YARN_CACHE_FOLDER = "${WORKSPACE}/.yarn-cache"
  }

  stages {
    stage('Install') {
      steps {
        sh 'node --version && yarn --version'
        sh 'yarn install --frozen-lockfile'
      }
    }

    stage('Env (contoh)') {
      steps {
        // Build butuh env valid (divalidasi zod di src/lib/env.ts).
        // CI gate memakai nilai contoh; deploy production mengganti .env
        // dengan nilai asli per-client sebelum `yarn build`.
        sh 'cp .env.example .env'
      }
    }

    stage('Lint') {
      steps {
        sh 'yarn lint'
      }
    }

    stage('Format') {
      steps {
        sh 'yarn fm:check'
      }
    }

    stage('Typecheck') {
      steps {
        sh 'yarn tsc:check'
      }
    }

    stage('Build') {
      steps {
        sh 'yarn build'
      }
    }
  }

  post {
    always {
      cleanWs(deleteDirs: true, notFailBuild: true, patterns: [[pattern: '.next/**', type: 'INCLUDE']])
    }
  }
}
