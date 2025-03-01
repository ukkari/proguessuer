import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// GitHub token for API requests (optional but helps with rate limiting)
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// List of popular GitHub repositories to select from
const popularRepos = [
  {
    owner: 'lodash',
    repo: 'lodash',
    language: 'JavaScript',
    description: 'A modern JavaScript utility library delivering modularity, performance, & extras.'
  },
  {
    owner: 'facebook',
    repo: 'react',
    language: 'JavaScript',
    description: 'A declarative, efficient, and flexible JavaScript library for building user interfaces.'
  },
  {
    owner: 'expressjs',
    repo: 'express',
    language: 'JavaScript',
    description: 'Fast, unopinionated, minimalist web framework for Node.js'
  },
  {
    owner: 'axios',
    repo: 'axios',
    language: 'JavaScript',
    description: 'Promise based HTTP client for the browser and node.js'
  },
  {
    owner: 'nodejs',
    repo: 'node',
    language: 'JavaScript',
    description: 'Node.js JavaScript runtime'
  },
  {
    owner: 'vercel',
    repo: 'next.js',
    language: 'JavaScript',
    description: 'The React Framework'
  },
  {
    owner: 'vuejs',
    repo: 'vue',
    language: 'JavaScript',
    description: 'Vue.js is a progressive, incrementally-adoptable JavaScript framework for building UI on the web.'
  },
  {
    owner: 'tailwindlabs',
    repo: 'tailwindcss',
    language: 'JavaScript',
    description: 'A utility-first CSS framework for rapid UI development.'
  },
  {
    owner: 'tensorflow',
    repo: 'tensorflow',
    language: 'Python',
    description: 'An open source machine learning framework for everyone'
  },
  {
    owner: 'pytorch',
    repo: 'pytorch',
    language: 'Python',
    description: 'Tensors and Dynamic neural networks in Python with strong GPU acceleration'
  },
  {
    owner: 'django',
    repo: 'django',
    language: 'Python',
    description: 'The Web framework for perfectionists with deadlines.'
  },
  {
    owner: 'pallets',
    repo: 'flask',
    language: 'Python',
    description: 'The Python micro framework for building web applications.'
  },
  {
    owner: 'rust-lang',
    repo: 'rust',
    language: 'Rust',
    description: 'Empowering everyone to build reliable and efficient software.'
  },
  {
    owner: 'golang',
    repo: 'go',
    language: 'Go',
    description: 'The Go programming language'
  },
  {
    owner: 'spring-projects',
    repo: 'spring-boot',
    language: 'Java',
    description: 'Spring Boot helps you to create Spring-powered, production-grade applications and services.'
  },
  {
    owner: 'laravel',
    repo: 'laravel',
    language: 'PHP',
    description: 'A PHP framework for web artisans'
  },
  {
    owner: 'dotnet',
    repo: 'aspnetcore',
    language: 'C#',
    description: 'ASP.NET Core is a cross-platform .NET framework for building modern cloud-based web applications.'
  },
  {
    owner: 'kubernetes',
    repo: 'kubernetes',
    language: 'Go',
    description: 'Production-Grade Container Scheduling and Management'
  },
  {
    owner: 'rails',
    repo: 'rails',
    language: 'Ruby',
    description: 'Ruby on Rails is a full-stack web framework optimized for programmer happiness and sustainable productivity.'
  },
  {
    owner: 'redis',
    repo: 'redis',
    language: 'C',
    description: 'An in-memory database that persists on disk.'
  },
  // JavaScript/TypeScript
  {
    owner: 'angular',
    repo: 'angular',
    language: 'TypeScript',
    description: 'The modern web developer\'s platform'
  },
  {
    owner: 'sveltejs',
    repo: 'svelte',
    language: 'TypeScript',
    description: 'Cybernetically enhanced web apps'
  },
  {
    owner: 'facebook',
    repo: 'react-native',
    language: 'JavaScript',
    description: 'A framework for building native applications using React'
  },
  {
    owner: 'reduxjs',
    repo: 'redux',
    language: 'TypeScript',
    description: 'Predictable state container for JavaScript apps'
  },
  {
    owner: 'storybookjs',
    repo: 'storybook',
    language: 'TypeScript',
    description: 'The UI component explorer. Develop, document, & test React, Vue, Angular, Web Components, Ember, Svelte & more!'
  },
  {
    owner: 'nestjs',
    repo: 'nest',
    language: 'TypeScript',
    description: 'A progressive Node.js framework for building efficient and scalable server-side applications.'
  },
  {
    owner: 'gatsbyjs',
    repo: 'gatsby',
    language: 'TypeScript',
    description: 'Build blazing fast, modern apps and websites with React'
  },
  {
    owner: 'nuxt',
    repo: 'nuxt',
    language: 'TypeScript',
    description: 'The Intuitive Vue Framework'
  },
  {
    owner: 'remix-run',
    repo: 'remix',
    language: 'TypeScript',
    description: 'Build better websites with Remix'
  },
  {
    owner: 'prisma',
    repo: 'prisma',
    language: 'TypeScript',
    description: 'Next-generation ORM for Node.js & TypeScript'
  },
  // Python
  {
    owner: 'scikit-learn',
    repo: 'scikit-learn',
    language: 'Python',
    description: 'Machine Learning in Python'
  },
  {
    owner: 'pandas-dev',
    repo: 'pandas',
    language: 'Python',
    description: 'Flexible and powerful data analysis / manipulation library for Python'
  },
  {
    owner: 'numpy',
    repo: 'numpy',
    language: 'Python',
    description: 'The fundamental package for scientific computing with Python'
  },
  {
    owner: 'matplotlib',
    repo: 'matplotlib',
    language: 'Python',
    description: 'Matplotlib: visualization with Python'
  },
  {
    owner: 'fastapi',
    repo: 'fastapi',
    language: 'Python',
    description: 'FastAPI framework, high performance, easy to learn, fast to code, ready for production'
  },
  {
    owner: 'tiangolo',
    repo: 'fastapi',
    language: 'Python',
    description: 'FastAPI framework, high performance, easy to learn, fast to code, ready for production'
  },
  {
    owner: 'huggingface',
    repo: 'transformers',
    language: 'Python',
    description: '🤗 Transformers: State-of-the-art Machine Learning for Pytorch, TensorFlow, and JAX.'
  },
  {
    owner: 'psf',
    repo: 'requests',
    language: 'Python',
    description: 'A simple, yet elegant, HTTP library for Python.'
  },
  {
    owner: 'scrapy',
    repo: 'scrapy',
    language: 'Python',
    description: 'Scrapy, a fast high-level web crawling & scraping framework for Python.'
  },
  {
    owner: 'pytest-dev',
    repo: 'pytest',
    language: 'Python',
    description: 'The pytest framework makes it easy to write small tests, yet scales to support complex functional testing'
  },
  // Java
  {
    owner: 'elastic',
    repo: 'elasticsearch',
    language: 'Java',
    description: 'Free and Open, Distributed, RESTful Search Engine'
  },
  {
    owner: 'apache',
    repo: 'kafka',
    language: 'Java',
    description: 'Mirror of Apache Kafka'
  },
  {
    owner: 'google',
    repo: 'guava',
    language: 'Java',
    description: 'Google core libraries for Java'
  },
  {
    owner: 'square',
    repo: 'retrofit',
    language: 'Java',
    description: 'A type-safe HTTP client for Android and the JVM'
  },
  {
    owner: 'square',
    repo: 'okhttp',
    language: 'Java',
    description: 'Square\'s meticulous HTTP client for the JVM, Android, and GraalVM.'
  },
  {
    owner: 'apache',
    repo: 'hadoop',
    language: 'Java',
    description: 'Apache Hadoop'
  },
  {
    owner: 'spring-projects',
    repo: 'spring-framework',
    language: 'Java',
    description: 'Spring Framework'
  },
  {
    owner: 'ReactiveX',
    repo: 'RxJava',
    language: 'Java',
    description: 'RxJava – Reactive Extensions for the JVM'
  },
  {
    owner: 'junit-team',
    repo: 'junit5',
    language: 'Java',
    description: 'The next generation of JUnit.'
  },
  {
    owner: 'netty',
    repo: 'netty',
    language: 'Java',
    description: 'Netty project - an event-driven asynchronous network application framework'
  },
  // Go
  {
    owner: 'gin-gonic',
    repo: 'gin',
    language: 'Go',
    description: 'Gin is a HTTP web framework written in Go (Golang). It features a Martini-like API with much better performance -- up to 40 times faster.'
  },
  {
    owner: 'gofiber',
    repo: 'fiber',
    language: 'Go',
    description: '⚡️ Express inspired web framework written in Go'
  },
  {
    owner: 'moby',
    repo: 'moby',
    language: 'Go',
    description: 'Moby Project - a collaborative project for the container ecosystem to assemble container-based systems'
  },
  {
    owner: 'etcd-io',
    repo: 'etcd',
    language: 'Go',
    description: 'Distributed reliable key-value store for the most critical data of a distributed system'
  },
  {
    owner: 'hashicorp',
    repo: 'terraform',
    language: 'Go',
    description: 'Terraform enables you to safely and predictably create, change, and improve infrastructure.'
  },
  {
    owner: 'prometheus',
    repo: 'prometheus',
    language: 'Go',
    description: 'The Prometheus monitoring system and time series database.'
  },
  {
    owner: 'cockroachdb',
    repo: 'cockroach',
    language: 'Go',
    description: 'CockroachDB - the open source, cloud-native distributed SQL database.'
  },
  {
    owner: 'traefik',
    repo: 'traefik',
    language: 'Go',
    description: 'The Cloud Native Application Proxy'
  },
  {
    owner: 'gohugoio',
    repo: 'hugo',
    language: 'Go',
    description: 'The world\'s fastest framework for building websites.'
  },
  {
    owner: 'grafana',
    repo: 'grafana',
    language: 'Go',
    description: 'The open and composable observability and data visualization platform.'
  },
  // Rust
  {
    owner: 'denoland',
    repo: 'deno',
    language: 'Rust',
    description: 'A modern runtime for JavaScript and TypeScript.'
  },
  {
    owner: 'alacritty',
    repo: 'alacritty',
    language: 'Rust',
    description: 'A cross-platform, OpenGL terminal emulator.'
  },
  {
    owner: 'tauri-apps',
    repo: 'tauri',
    language: 'Rust',
    description: 'Build smaller, faster, and more secure desktop applications with a web frontend.'
  },
  {
    owner: 'starship',
    repo: 'starship',
    language: 'Rust',
    description: '☄🌌️ The minimal, blazing-fast, and infinitely customizable prompt for any shell!'
  },
  {
    owner: 'yewstack',
    repo: 'yew',
    language: 'Rust',
    description: 'Rust / Wasm framework for building client web apps'
  },
  {
    owner: 'tokio-rs',
    repo: 'tokio',
    language: 'Rust',
    description: 'A runtime for writing reliable asynchronous applications with Rust.'
  },
  {
    owner: 'seanmonstar',
    repo: 'reqwest',
    language: 'Rust',
    description: 'An easy and powerful Rust HTTP Client'
  },
  {
    owner: 'diesel-rs',
    repo: 'diesel',
    language: 'Rust',
    description: 'A safe, extensible ORM and Query Builder for Rust'
  },
  {
    owner: 'actix',
    repo: 'actix-web',
    language: 'Rust',
    description: 'Actix Web is a powerful, pragmatic, and extremely fast web framework for Rust.'
  },
  {
    owner: 'clap-rs',
    repo: 'clap',
    language: 'Rust',
    description: 'A full featured, fast Command Line Argument Parser for Rust'
  },
  // C/C++
  {
    owner: 'electron',
    repo: 'electron',
    language: 'C++',
    description: 'Build cross-platform desktop apps with JavaScript, HTML, and CSS'
  },
  {
    owner: 'opencv',
    repo: 'opencv',
    language: 'C++',
    description: 'Open Source Computer Vision Library'
  },
  {
    owner: 'protocolbuffers',
    repo: 'protobuf',
    language: 'C++',
    description: 'Protocol Buffers - Google\'s data interchange format'
  },
  {
    owner: 'bitcoin',
    repo: 'bitcoin',
    language: 'C++',
    description: 'Bitcoin Core integration/staging tree'
  },
  {
    owner: 'godotengine',
    repo: 'godot',
    language: 'C++',
    description: 'Godot Engine – Multi-platform 2D and 3D game engine'
  },
  {
    owner: 'llvm',
    repo: 'llvm-project',
    language: 'C++',
    description: 'The LLVM Project is a collection of modular and reusable compiler and toolchain technologies'
  },
  {
    owner: 'microsoft',
    repo: 'terminal',
    language: 'C++',
    description: 'The new Windows Terminal and the original Windows console host, all in the same place!'
  },
  {
    owner: 'google',
    repo: 'leveldb',
    language: 'C++',
    description: 'LevelDB is a fast key-value storage library written at Google that provides an ordered mapping from string keys to string values.'
  },
  {
    owner: 'nlohmann',
    repo: 'json',
    language: 'C++',
    description: 'JSON for Modern C++'
  },
  // C#/.NET
  {
    owner: 'dotnet',
    repo: 'runtime',
    language: 'C#',
    description: '.NET is a cross-platform runtime for cloud, mobile, desktop, and IoT apps.'
  },
  {
    owner: 'PowerShell',
    repo: 'PowerShell',
    language: 'C#',
    description: 'PowerShell for every system!'
  },
  {
    owner: 'dotnet',
    repo: 'efcore',
    language: 'C#',
    description: 'EF Core is a modern object-database mapper for .NET.'
  },
  {
    owner: 'AvaloniaUI',
    repo: 'Avalonia',
    language: 'C#',
    description: 'A cross-platform UI framework for .NET'
  },
  {
    owner: 'jstedfast',
    repo: 'MailKit',
    language: 'C#',
    description: 'A cross-platform .NET library for IMAP, POP3, and SMTP.'
  },
  {
    owner: 'dotnet',
    repo: 'maui',
    language: 'C#',
    description: '.NET MAUI is the .NET Multi-platform App UI, a framework for building native device applications spanning mobile, tablet, and desktop.'
  },
  {
    owner: 'SignalR',
    repo: 'SignalR',
    language: 'C#',
    description: 'Incredibly simple real-time web for .NET'
  },
  {
    owner: 'xunit',
    repo: 'xunit',
    language: 'C#',
    description: 'xUnit.net is a free, open source, community-focused unit testing tool for the .NET Framework.'
  },
  {
    owner: 'serilog',
    repo: 'serilog',
    language: 'C#',
    description: 'Simple .NET logging with fully-structured events'
  },
  {
    owner: 'AutoMapper',
    repo: 'AutoMapper',
    language: 'C#',
    description: 'A convention-based object-object mapper in .NET.'
  },
  // Ruby
  {
    owner: 'jekyll',
    repo: 'jekyll',
    language: 'Ruby',
    description: 'Jekyll is a blog-aware static site generator in Ruby'
  },
  {
    owner: 'discourse',
    repo: 'discourse',
    language: 'Ruby',
    description: 'A platform for community discussion. Free, open, simple.'
  },
  {
    owner: 'fastlane',
    repo: 'fastlane',
    language: 'Ruby',
    description: '🚀 The easiest way to automate building and releasing your iOS and Android apps'
  },
  {
    owner: 'Homebrew',
    repo: 'brew',
    language: 'Ruby',
    description: '🍺 The missing package manager for macOS (or Linux)'
  },
  {
    owner: 'rspec',
    repo: 'rspec-rails',
    language: 'Ruby',
    description: 'RSpec for Rails-5+'
  },
  // PHP
  {
    owner: 'symfony',
    repo: 'symfony',
    language: 'PHP',
    description: 'The Symfony PHP framework'
  },
  {
    owner: 'composer',
    repo: 'composer',
    language: 'PHP',
    description: 'Dependency Manager for PHP'
  },
  {
    owner: 'guzzle',
    repo: 'guzzle',
    language: 'PHP',
    description: 'Guzzle, an extensible PHP HTTP client'
  },
  {
    owner: 'phpunit',
    repo: 'phpunit',
    language: 'PHP',
    description: 'The PHP Unit Testing framework'
  },
  {
    owner: 'yiisoft',
    repo: 'yii2',
    language: 'PHP',
    description: 'Yii 2: The Fast, Secure and Professional PHP Framework'
  },
  // Swift
  {
    owner: 'apple',
    repo: 'swift',
    language: 'Swift',
    description: 'The Swift Programming Language'
  },
  {
    owner: 'Alamofire',
    repo: 'Alamofire',
    language: 'Swift',
    description: 'Elegant HTTP Networking in Swift'
  },
  {
    owner: 'Moya',
    repo: 'Moya',
    language: 'Swift',
    description: 'Network abstraction layer written in Swift'
  },
  {
    owner: 'ReactiveX',
    repo: 'RxSwift',
    language: 'Swift',
    description: 'Reactive Programming in Swift'
  },
  {
    owner: 'SwiftyJSON',
    repo: 'SwiftyJSON',
    language: 'Swift',
    description: 'The better way to deal with JSON data in Swift'
  },
  // Kotlin
  {
    owner: 'JetBrains',
    repo: 'kotlin',
    language: 'Kotlin',
    description: 'The Kotlin Programming Language'
  },
  {
    owner: 'square',
    repo: 'okio',
    language: 'Kotlin',
    description: 'A modern I/O library for Android, Kotlin, and Java'
  },
  {
    owner: 'Kotlin',
    repo: 'kotlinx.coroutines',
    language: 'Kotlin',
    description: 'Library support for Kotlin coroutines'
  },
  {
    owner: 'InsertKoinIO',
    repo: 'koin',
    language: 'Kotlin',
    description: 'Koin - a pragmatic lightweight dependency injection framework for Kotlin'
  },
  {
    owner: 'ktorio',
    repo: 'ktor',
    language: 'Kotlin',
    description: 'Framework for quickly creating connected applications in Kotlin with minimal effort'
  }
];

// Define interface for code file
interface CodeFile {
  content: string;
  url: string;
  path: string;
}

// Function to fetch files from a repository
async function fetchRepoFiles(owner: string, repo: string, path: string = '') {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3+json',
  };
  
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `token ${GITHUB_TOKEN}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Function to fetch a specific file content
async function fetchFileContent(owner: string, repo: string, path: string): Promise<CodeFile> {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3+json',
  };
  
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `token ${GITHUB_TOKEN}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  // Content is base64 encoded
  if (data.content) {
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    return {
      content,
      url: data.html_url,
      path: data.path
    };
  }
  
  throw new Error('No content found in file');
}

// Function to check if a file is a code file we're interested in
function isCodeFile(filename: string) {
  const codeExtensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.rb', '.java', '.go', '.c', '.cpp', '.cs', '.php', '.rs'];
  return codeExtensions.some(ext => filename.toLowerCase().endsWith(ext));
}

// Function to get a random interesting code file from a repository
async function getRandomCodeFile(owner: string, repo: string): Promise<CodeFile> {
  try {
    // First, get the list of directories in the repo
    const dirs = await fetchRepoFiles(owner, repo);
    
    // Look for likely code directories
    const codeDirs = dirs
      .filter((item: any) => item.type === 'dir')
      .filter((item: any) => {
        const dirName = item.name.toLowerCase();
        return ['src', 'lib', 'core', 'main', 'utils', 'helpers', 'components', 'packages'].includes(dirName);
      });
    
    // If we don't find any code dirs, select from all dirs
    const targetDirs = codeDirs.length > 0 ? codeDirs : dirs.filter((item: any) => item.type === 'dir');
    
    // If no directories, try to find code files at the root
    if (targetDirs.length === 0) {
      const rootFiles = dirs.filter((item: any) => item.type === 'file' && isCodeFile(item.name));
      if (rootFiles.length === 0) {
        throw new Error('No suitable code files found in repository');
      }
      
      const randomFile = rootFiles[Math.floor(Math.random() * rootFiles.length)];
      return await fetchFileContent(owner, repo, randomFile.path);
    }
    
    // Select a random directory
    const randomDir = targetDirs[Math.floor(Math.random() * targetDirs.length)];
    
    // Get files from that directory
    const files = await fetchRepoFiles(owner, repo, randomDir.path);
    
    // Filter for code files
    const codeFiles = files.filter((item: any) => item.type === 'file' && isCodeFile(item.name));
    
    // If no code files in this directory, try another approach
    if (codeFiles.length === 0) {
      // Try a nested directory if available
      const nestedDirs = files.filter((item: any) => item.type === 'dir');
      if (nestedDirs.length > 0) {
        const randomNestedDir = nestedDirs[Math.floor(Math.random() * nestedDirs.length)];
        const nestedFiles = await fetchRepoFiles(owner, repo, randomNestedDir.path);
        const nestedCodeFiles = nestedFiles.filter((item: any) => item.type === 'file' && isCodeFile(item.name));
        
        if (nestedCodeFiles.length > 0) {
          const randomNestedFile = nestedCodeFiles[Math.floor(Math.random() * nestedCodeFiles.length)];
          return await fetchFileContent(owner, repo, randomNestedFile.path);
        }
      }
      
      // If still no files, search in root again
      return await getRandomCodeFile(owner, repo);
    }
    
    // Select a random code file
    const randomFile = codeFiles[Math.floor(Math.random() * codeFiles.length)];
    return await fetchFileContent(owner, repo, randomFile.path);
  } catch (error) {
    console.error(`Error getting random code file from ${owner}/${repo}:`, error);
    throw error;
  }
}

// Function to analyze code with OpenAI to get a description and complexity
async function analyzeCode(code: string, path: string, language: string) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert code analyzer. Given a code snippet, provide a concise description of what the code does and rate its complexity on a scale of 1-10, where 1 is very simple and 10 is extremely complex. Consider factors like algorithmic complexity, number of control structures, and overall cognitive load required to understand the code."
        },
        {
          role: "user",
          content: `Analyze this ${language} code from the file ${path}:\n\n${code}\n\nProvide a concise description (1-2 sentences) of what this code does and rate its complexity on a scale of 1-10. If this is a configuration file, initialization code, or extremely simple boilerplate, explicitly rate it lower than 3.`
        }
      ],
      temperature: 0.7,
      max_tokens: 300,
      response_format: { type: "json_object" }, // Request structured response
    });

    let analysis;
    try {
      // Parse JSON response
      analysis = JSON.parse(response.choices[0].message.content || '{}');
      return {
        description: analysis.description || "This code implements functionality relevant to the repository.",
        complexity: analysis.complexity || 5
      };
    } catch (err) {
      // Fallback to text parsing if JSON parsing fails
      const analysisText = response.choices[0].message.content || '';
      
      // Extract description and complexity from AI response
      let description = analysisText;
      let complexity = 5; // Default value
      
      const complexityMatch = analysisText.match(/complexity.*?(\d+)/i);
      if (complexityMatch && complexityMatch[1]) {
        complexity = parseInt(complexityMatch[1]);
        // Ensure complexity is within bounds
        complexity = Math.min(Math.max(complexity, 1), 10);
        
        // Remove the complexity part from description
        description = analysisText.replace(/complexity.*?(\d+)/i, '').trim();
      }
      
      return { description, complexity };
    }
  } catch (error) {
    console.error('Error analyzing code with OpenAI:', error);
    // Return a default analysis if there's an error
    return { 
      description: "This code implements functionality relevant to the repository.",
      complexity: 5
    };
  }
}

// Function to get a random code file with appropriate complexity
async function getAppropriateCodeFile(owner: string, repo: string, minComplexity: number = 4) {
  // Try up to 3 times to find an appropriately complex file
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      // Get a random code file
      const codeData = await getRandomCodeFile(owner, repo);
      
      // Analyze the complexity
      const analysis = await analyzeCode(
        codeData.content,
        codeData.path,
        getLanguageFromPath(codeData.path)
      );
      
      console.log(`Selected file ${codeData.path} has complexity: ${analysis.complexity}`);
      
      // If complexity is sufficient, return it
      if (analysis.complexity >= minComplexity) {
        return {
          ...codeData,
          description: analysis.description,
          complexity: analysis.complexity
        };
      } else {
        console.log(`File ${codeData.path} complexity too low (${analysis.complexity}), trying again...`);
      }
    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed:`, error);
      if (attempt === 2) throw error; // Re-throw on last attempt
    }
  }
  
  throw new Error('Could not find a file with appropriate complexity');
}

// Helper to determine language from file path
function getLanguageFromPath(path: string) {
  const extension = path.split('.').pop()?.toLowerCase();
  
  const languageMap: Record<string, string> = {
    'js': 'JavaScript',
    'jsx': 'JavaScript (React)',
    'ts': 'TypeScript',
    'tsx': 'TypeScript (React)',
    'py': 'Python',
    'rb': 'Ruby',
    'java': 'Java',
    'go': 'Go',
    'c': 'C',
    'cpp': 'C++',
    'cs': 'C#',
    'php': 'PHP',
    'rs': 'Rust',
  };
  
  return languageMap[extension || ''] || 'Unknown';
}

// Keep track of repositories used in each game to avoid repeats
const gameRepoHistory: Record<string, string[]> = {};

export async function POST(request: Request) {
  try {
    const { gameId, roundNumber } = await request.json();
    
    // Get game room details to check player IDs
    const { data: gameRoom, error: gameError } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('id', gameId)
      .single();
    
    if (gameError || !gameRoom) {
      return NextResponse.json({ error: 'Game room not found' }, { status: 404 });
    }
    
    // Initialize repo history for this game if it doesn't exist
    if (!gameRepoHistory[gameId]) {
      gameRepoHistory[gameId] = [];
    }
    
    // Filter out repositories that have already been used in this game
    const availableRepos = popularRepos.filter(
      repo => !gameRepoHistory[gameId].includes(`${repo.owner}/${repo.repo}`)
    );
    
    // If we've used all repositories or none are available, reset the history
    const repoPool = availableRepos.length > 0 ? availableRepos : popularRepos;
    
    // Select a random repository from the available pool
    const randomRepoIndex = Math.floor(Math.random() * repoPool.length);
    const selectedRepo = repoPool[randomRepoIndex];
    
    // Add to history
    const repoKey = `${selectedRepo.owner}/${selectedRepo.repo}`;
    if (!gameRepoHistory[gameId].includes(repoKey)) {
      gameRepoHistory[gameId].push(repoKey);
    }
    
    console.log(`Round ${roundNumber}: Selected repo ${repoKey}`);
    console.log(`Game ${gameId} repo history:`, gameRepoHistory[gameId]);
    
    let codeData;
    let programDescription;
    let complexity;
    
    try {
      // Try to get appropriate code from GitHub API
      const result = await getAppropriateCodeFile(selectedRepo.owner, selectedRepo.repo, 4);
      
      codeData = {
        content: result.content,
        url: result.url,
        path: result.path
      };
      programDescription = result.description;
      complexity = result.complexity;
    } catch (error) {
      console.error('Error fetching from GitHub API for primary repo, trying alternative repo:', error);
      
      // Try with a different repository instead of using fallback snippets
      // Get remaining repos that haven't been tried yet
      const remainingRepos = repoPool.filter(repo => 
        `${repo.owner}/${repo.repo}` !== repoKey
      );
      
      if (remainingRepos.length === 0) {
        return NextResponse.json({ error: 'Failed to fetch code from any repository' }, { status: 500 });
      }
      
      // Select a different random repository
      const backupRepoIndex = Math.floor(Math.random() * remainingRepos.length);
      const backupRepo = remainingRepos[backupRepoIndex];
      
      console.log(`Trying backup repo: ${backupRepo.owner}/${backupRepo.repo}`);
      
      try {
        // Try to get code from the backup repository
        const backupResult = await getAppropriateCodeFile(backupRepo.owner, backupRepo.repo, 3);
        
        codeData = {
          content: backupResult.content,
          url: backupResult.url,
          path: backupResult.path
        };
        programDescription = backupResult.description;
        complexity = backupResult.complexity;
        
        // Add backup repo to history if successful
        const backupRepoKey = `${backupRepo.owner}/${backupRepo.repo}`;
        if (!gameRepoHistory[gameId].includes(backupRepoKey)) {
          gameRepoHistory[gameId].push(backupRepoKey);
        }
      } catch (backupError) {
        console.error('Error fetching from backup GitHub repo:', backupError);
        return NextResponse.json({ error: 'Failed to fetch code from any repository' }, { status: 500 });
      }
    }
    
    // Calculate time limit based on complexity (10-60 seconds)
    // More complex code = more time
    const baseTime = 30; // base seconds
    const complexityFactor = 10; // seconds per complexity point
    const timeLimit = baseTime + (complexity * complexityFactor);
    
    // Create a new round
    const { data: round, error: roundError } = await supabase
      .from('rounds')
      .insert({
        game_room_id: gameId,
        round_number: roundNumber,
        program_url: codeData.url,
        program_code: codeData.content,
        program_description: programDescription,
        time_limit: timeLimit,
        status: 'active',
      })
      .select()
      .single();
    
    if (roundError) {
      return NextResponse.json({ error: 'Failed to create round' }, { status: 500 });
    }
    
    // Clean up history for completed games
    if (roundNumber >= gameRoom.total_rounds) {
      delete gameRepoHistory[gameId];
    }
    
    return NextResponse.json({ success: true, round });
    
  } catch (error) {
    console.error('Error creating round:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}