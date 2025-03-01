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

// ギフハブAPIの呼び出し試行回数を制限するためのカウンター
let githubApiAttempts = 0;
const MAX_GITHUB_API_ATTEMPTS = 3;

// ギフハブAPIの呼び出し数をリセットする関数
function resetGithubApiAttempts() {
  githubApiAttempts = 0;
}

// ギフハブAPIの呼び出し数をインクリメントし、制限に達したかチェックする関数
function incrementAndCheckGithubApiAttempts(): boolean {
  githubApiAttempts++;
  console.log(`[DEBUG] GitHub API attempt ${githubApiAttempts}/${MAX_GITHUB_API_ATTEMPTS}`);
  return githubApiAttempts <= MAX_GITHUB_API_ATTEMPTS;
}

// Function to check if GitHub API data exists in Supabase cache
async function checkGitHubCache(owner: string, repo: string, path: string = '', type: 'directory' | 'file' = 'directory') {
  console.log(`[DEBUG] Checking GitHub cache for ${owner}/${repo}/${path} (type: ${type})`);
  
  try {
    const { data, error } = await supabase
      .from('github_cache')
      .select('*')
      .eq('owner', owner)
      .eq('repo', repo)
      .eq('path', path)
      .eq('content_type', type)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No results found, this is expected when cache is empty
        console.log(`[DEBUG] No cache entry found for ${owner}/${repo}/${path}`);
        return null;
      }
      
      console.error(`[ERROR] Error checking GitHub cache:`, error);
      return null;
    }
    
    console.log(`[DEBUG] Cache hit for ${owner}/${repo}/${path}, last accessed: ${data.last_accessed}`);
    
    // Update last_accessed time
    const { error: updateError } = await supabase
      .from('github_cache')
      .update({ last_accessed: new Date().toISOString() })
      .eq('id', data.id);
    
    if (updateError) {
      console.error(`[ERROR] Failed to update last_accessed time:`, updateError);
    }
    
    return data;
  } catch (error) {
    console.error(`[ERROR] Exception in checkGitHubCache for ${owner}/${repo}/${path}:`, error);
    return null;
  }
}

// Function to store GitHub API data in Supabase cache
async function storeGitHubCache(owner: string, repo: string, path: string, url: string, content: any, type: 'directory' | 'file' = 'directory') {
  console.log(`[DEBUG] Storing GitHub data in cache for ${owner}/${repo}/${path} (type: ${type})`);
  
  const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
  
  try {
    const { data, error } = await supabase
      .from('github_cache')
      .insert({
        owner,
        repo,
        path,
        url,
        content: contentStr,
        content_type: type,
        last_accessed: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error(`[ERROR] Failed to store GitHub data in cache:`, error);
      return false;
    }
    
    console.log(`[DEBUG] Successfully stored GitHub data in cache, id: ${data.id}`);
    return true;
  } catch (error) {
    console.error(`[ERROR] Exception in storeGitHubCache for ${owner}/${repo}/${path}:`, error);
    return false;
  }
}

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
  console.log(`[DEBUG] Fetching repo files from ${owner}/${repo}/${path}`);
  
  // First check if the data exists in cache
  const cachedData = await checkGitHubCache(owner, repo, path, 'directory');
  if (cachedData) {
    console.log(`[DEBUG] Using cached data for ${owner}/${repo}/${path}`);
    try {
      return JSON.parse(cachedData.content);
    } catch (error) {
      console.error(`[ERROR] Failed to parse cached JSON content:`, error);
      // Continue with GitHub API call if cache parsing fails
    }
  }

  // 試行回数の制限をチェック
  if (!incrementAndCheckGithubApiAttempts()) {
    console.log(`[DEBUG] GitHub API attempt limit reached, looking for cached data instead`);
    const fallbackCachedData = await getRandomCachedDirectory();
    if (fallbackCachedData) {
      return fallbackCachedData;
    }
    throw new Error(`GitHub API attempt limit reached and no cached directories available`);
  }
  
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  console.log(`[DEBUG] No cache hit, fetching from GitHub API: ${url}`);
  
  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3+json',
  };
  
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `token ${GITHUB_TOKEN}`;
    console.log(`[DEBUG] Using GitHub token for authentication`);
  } else {
    console.log(`[DEBUG] No GitHub token provided, may hit rate limits`);
  }

  try {
    const response = await fetch(url, { headers });
    
    // Log rate limit information if available
    const rateLimit = {
      limit: response.headers.get('x-ratelimit-limit'),
      remaining: response.headers.get('x-ratelimit-remaining'),
      reset: response.headers.get('x-ratelimit-reset')
    };
    console.log(`[DEBUG] GitHub API rate limit info:`, rateLimit);
    
    if (!response.ok) {
      console.error(`[ERROR] GitHub API error for ${url}: ${response.status} ${response.statusText}`);
      const responseText = await response.text();
      console.error(`[ERROR] Response body: ${responseText.substring(0, 200)}...`);
      
      if (response.status === 403 && rateLimit.remaining === '0') {
        console.error(`[ERROR] Rate limit exceeded. Reset at ${new Date(parseInt(rateLimit.reset || '0') * 1000).toLocaleString()}`);
        throw new Error(`GitHub API rate limit exceeded`);
      }
      
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`[DEBUG] Successfully fetched ${Array.isArray(data) ? data.length : 1} items from ${url}`);
    
    // Store the fetched data in cache
    await storeGitHubCache(owner, repo, path, url, data, 'directory');
    
    return data;
  } catch (error) {
    console.error(`[ERROR] Exception in fetchRepoFiles for ${owner}/${repo}/${path}:`, error);
    throw error;
  }
}

// Function to get random cached directory data when GitHub API calls fail
async function getRandomCachedDirectory(): Promise<any[] | null> {
  console.log(`[DEBUG] Trying to get random cached directory data due to GitHub API failures`);
  
  try {
    // Get a list of cached directories
    const { data: cachedDirs, error } = await supabase
      .from('github_cache')
      .select('*')
      .eq('content_type', 'directory')
      .order('last_accessed', { ascending: false })
      .limit(50); // Get the 50 most recently accessed directories
    
    if (error) {
      console.error(`[ERROR] Error retrieving cached directories:`, error);
      return null;
    }
    
    if (!cachedDirs || cachedDirs.length === 0) {
      console.log(`[DEBUG] No cached directories available`);
      return null;
    }
    
    console.log(`[DEBUG] Found ${cachedDirs.length} cached directories to choose from`);
    
    // Select a random directory from the cache
    const randomDir = cachedDirs[Math.floor(Math.random() * cachedDirs.length)];
    console.log(`[DEBUG] Selected random cached directory: ${randomDir.owner}/${randomDir.repo}/${randomDir.path}`);
    
    // Update last_accessed time
    const { error: updateError } = await supabase
      .from('github_cache')
      .update({ last_accessed: new Date().toISOString() })
      .eq('id', randomDir.id);
    
    if (updateError) {
      console.error(`[ERROR] Failed to update last_accessed time:`, updateError);
    }
    
    // Parse the directory content
    try {
      return JSON.parse(randomDir.content);
    } catch (parseError) {
      console.error(`[ERROR] Failed to parse cached directory content:`, parseError);
      return null;
    }
  } catch (error) {
    console.error(`[ERROR] Exception in getRandomCachedDirectory:`, error);
    return null;
  }
}

// Function to fetch a specific file content
async function fetchFileContent(owner: string, repo: string, path: string): Promise<CodeFile> {
  console.log(`[DEBUG] Fetching file content from ${owner}/${repo}/${path}`);
  
  // First check if the data exists in cache
  const cachedData = await checkGitHubCache(owner, repo, path, 'file');
  if (cachedData) {
    console.log(`[DEBUG] Using cached file content for ${owner}/${repo}/${path}`);
    return {
      content: cachedData.content,
      url: cachedData.url,
      path: cachedData.path
    };
  }

  // 試行回数の制限をチェック
  if (!incrementAndCheckGithubApiAttempts()) {
    console.log(`[DEBUG] GitHub API attempt limit reached, looking for cached file instead`);
    const cachedFile = await getRandomCachedFile();
    if (cachedFile) {
      return cachedFile;
    }
    throw new Error(`GitHub API attempt limit reached and no cached files available`);
  }
  
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  console.log(`[DEBUG] No cache hit, fetching file from GitHub API: ${url}`);
  
  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3+json',
  };
  
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `token ${GITHUB_TOKEN}`;
  }

  try {
    const response = await fetch(url, { headers });
    
    // Log rate limit information
    const rateLimit = {
      limit: response.headers.get('x-ratelimit-limit'),
      remaining: response.headers.get('x-ratelimit-remaining'),
      reset: response.headers.get('x-ratelimit-reset')
    };
    console.log(`[DEBUG] GitHub API rate limit info:`, rateLimit);
    
    if (!response.ok) {
      console.error(`[ERROR] GitHub API error for ${url}: ${response.status} ${response.statusText}`);
      const responseText = await response.text();
      console.error(`[ERROR] Response body: ${responseText.substring(0, 200)}...`);
      
      if (response.status === 403 && rateLimit.remaining === '0') {
        console.error(`[ERROR] Rate limit exceeded. Reset at ${new Date(parseInt(rateLimit.reset || '0') * 1000).toLocaleString()}`);
        throw new Error(`GitHub API rate limit exceeded`);
      }
      
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Content is base64 encoded
    if (data.content) {
      console.log(`[DEBUG] Successfully fetched file content for ${path}, size: ${data.size} bytes`);
      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      
      const codeFile = {
        content,
        url: data.html_url,
        path: data.path
      };
      
      // Store the fetched file content in cache
      await storeGitHubCache(owner, repo, path, data.html_url, content, 'file');
      
      return codeFile;
    }
    
    console.error(`[ERROR] No content found in file ${path}`);
    throw new Error('No content found in file');
  } catch (error) {
    console.error(`[ERROR] Exception in fetchFileContent for ${owner}/${repo}/${path}:`, error);
    throw error;
  }
}

// Function to check if a file is a code file we're interested in
function isCodeFile(filename: string) {
  const codeExtensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.rb', '.java', '.go', '.c', '.cpp', '.cs', '.php', '.rs'];
  return codeExtensions.some(ext => filename.toLowerCase().endsWith(ext));
}

// Function to get random cached code files when GitHub API rate limit is hit
async function getRandomCachedFile(): Promise<CodeFile | null> {
  console.log(`[DEBUG] Trying to get a random cached file due to GitHub API rate limits`);
  
  try {
    // Get a list of all cached files
    const { data: cachedFiles, error } = await supabase
      .from('github_cache')
      .select('*')
      .eq('content_type', 'file')
      .order('last_accessed', { ascending: false })
      .limit(100); // Get the 100 most recently accessed files
    
    if (error) {
      console.error(`[ERROR] Error retrieving cached files:`, error);
      return null;
    }
    
    if (!cachedFiles || cachedFiles.length === 0) {
      console.log(`[DEBUG] No cached files available`);
      return null;
    }
    
    console.log(`[DEBUG] Found ${cachedFiles.length} cached files to choose from`);
    
    // Select a random file from the cache
    const randomFile = cachedFiles[Math.floor(Math.random() * cachedFiles.length)];
    console.log(`[DEBUG] Selected random cached file: ${randomFile.owner}/${randomFile.repo}/${randomFile.path}`);
    
    // Update last_accessed time
    const { error: updateError } = await supabase
      .from('github_cache')
      .update({ last_accessed: new Date().toISOString() })
      .eq('id', randomFile.id);
    
    if (updateError) {
      console.error(`[ERROR] Failed to update last_accessed time:`, updateError);
    }
    
    return {
      content: randomFile.content,
      url: randomFile.url,
      path: randomFile.path
    };
  } catch (error) {
    console.error(`[ERROR] Exception in getRandomCachedFile:`, error);
    return null;
  }
}

// Function to get a random interesting code file from a repository
async function getRandomCodeFile(owner: string, repo: string): Promise<CodeFile> {
  console.log(`[DEBUG] Getting random code file from ${owner}/${repo}`);
  
  // GitHubの試行回数をリセット（新しいリクエストの開始）
  resetGithubApiAttempts();
  
  try {
    // First, get the list of directories in the repo
    console.log(`[DEBUG] Fetching root directories for ${owner}/${repo}`);
    const dirs = await fetchRepoFiles(owner, repo);
    
    // Look for likely code directories
    const codeDirs = dirs
      .filter((item: any) => item.type === 'dir')
      .filter((item: any) => {
        const dirName = item.name.toLowerCase();
        return ['src', 'lib', 'core', 'main', 'utils', 'helpers', 'components', 'packages'].includes(dirName);
      });
    
    console.log(`[DEBUG] Found ${codeDirs.length} potential code directories out of ${dirs.length} total directories`);
    
    // If we don't find any code dirs, select from all dirs
    const targetDirs = codeDirs.length > 0 ? codeDirs : dirs.filter((item: any) => item.type === 'dir');
    console.log(`[DEBUG] Using ${targetDirs.length} target directories for file search`);
    
    // If no directories, try to find code files at the root
    if (targetDirs.length === 0) {
      console.log(`[DEBUG] No directories found, looking for code files at root level`);
      const rootFiles = dirs.filter((item: any) => item.type === 'file' && isCodeFile(item.name));
      console.log(`[DEBUG] Found ${rootFiles.length} code files at root level`);
      
      if (rootFiles.length === 0) {
        console.error(`[ERROR] No suitable code files found in repository ${owner}/${repo}`);
        throw new Error('No suitable code files found in repository');
      }
      
      const randomFile = rootFiles[Math.floor(Math.random() * rootFiles.length)];
      console.log(`[DEBUG] Selected random root file: ${randomFile.path}`);
      return await fetchFileContent(owner, repo, randomFile.path);
    }
    
    // Select a random directory
    const randomDir = targetDirs[Math.floor(Math.random() * targetDirs.length)];
    console.log(`[DEBUG] Selected random directory: ${randomDir.path}`);
    
    // Get files from that directory
    console.log(`[DEBUG] Fetching files from directory: ${randomDir.path}`);
    const files = await fetchRepoFiles(owner, repo, randomDir.path);
    
    // Filter for code files
    const codeFiles = files.filter((item: any) => item.type === 'file' && isCodeFile(item.name));
    console.log(`[DEBUG] Found ${codeFiles.length} code files in directory ${randomDir.path}`);
    
    // If no code files in this directory, try another approach
    if (codeFiles.length === 0) {
      console.log(`[DEBUG] No code files found in ${randomDir.path}, trying nested directories`);
      // Try a nested directory if available
      const nestedDirs = files.filter((item: any) => item.type === 'dir');
      console.log(`[DEBUG] Found ${nestedDirs.length} nested directories to try`);
      
      if (nestedDirs.length > 0) {
        const randomNestedDir = nestedDirs[Math.floor(Math.random() * nestedDirs.length)];
        console.log(`[DEBUG] Trying nested directory: ${randomNestedDir.path}`);
        
        const nestedFiles = await fetchRepoFiles(owner, repo, randomNestedDir.path);
        const nestedCodeFiles = nestedFiles.filter((item: any) => item.type === 'file' && isCodeFile(item.name));
        console.log(`[DEBUG] Found ${nestedCodeFiles.length} code files in nested directory ${randomNestedDir.path}`);
        
        if (nestedCodeFiles.length > 0) {
          const randomNestedFile = nestedCodeFiles[Math.floor(Math.random() * nestedCodeFiles.length)];
          console.log(`[DEBUG] Selected random file from nested directory: ${randomNestedFile.path}`);
          return await fetchFileContent(owner, repo, randomNestedFile.path);
        }
        console.log(`[DEBUG] No code files in nested directory, trying root again`);
      }
      
      // If still no files, search in root again
      console.log(`[DEBUG] Recursively calling getRandomCodeFile for ${owner}/${repo}`);
      return await getRandomCodeFile(owner, repo);
    }
    
    // Select a random code file
    const randomFile = codeFiles[Math.floor(Math.random() * codeFiles.length)];
    console.log(`[DEBUG] Selected random file: ${randomFile.path}`);
    return await fetchFileContent(owner, repo, randomFile.path);
  } catch (error) {
    console.error(`[ERROR] Error getting random code file from ${owner}/${repo}:`, error);
    
    // Check if the error is due to GitHub API rate limit or attempt limit
    if ((error instanceof Error && error.message && error.message.includes('rate limit exceeded')) ||
        (error instanceof Error && error.message && error.message.includes('API attempt limit'))) {
      console.log(`[DEBUG] GitHub API issue, trying to use cached files`);
      
      // Try to get a random cached file
      const cachedFile = await getRandomCachedFile();
      if (cachedFile) {
        console.log(`[DEBUG] Successfully retrieved random cached file as fallback`);
        return cachedFile;
      }
    }
    
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
          content: `You are an expert code analyzer. Analyze the provided code and return a JSON response with exactly two fields:
          1. "description": A concise 1-2 sentence description of what the code does
          2. "complexity": A numeric rating from 1-10 (integers only) where 1 is very simple and 10 is extremely complex
          
          For complexity ratings, consider:
          - Algorithmic complexity
          - Control flow complexity
          - Number of abstractions
          - Cognitive load required to understand
          
          If this is a configuration file, initialization code, or extremely simple boilerplate, explicitly rate it lower than 3.
          
          Your response must be valid JSON with only these two fields.`
        },
        {
          role: "user",
          content: `Analyze this ${language} code from the file ${path}:\n\n${code}\n\nProvide a JSON response with a concise description and complexity rating.`
        }
      ],
      temperature: 0.7,
      max_tokens: 300,
      response_format: { type: "json_object" },
    });

    // Parse JSON response with error handling
    try {
      const analysisText = response.choices[0].message.content || '{}';
      const analysis = JSON.parse(analysisText);
      
      // Validate expected fields exist
      if (!analysis.description || typeof analysis.complexity !== 'number') {
        console.warn('Incomplete analysis response:', analysisText);
        return {
          description: analysis.description || "This code implements functionality relevant to the repository.",
          complexity: analysis.complexity || 5
        };
      }
      
      // Ensure complexity is within bounds
      const complexity = Math.min(Math.max(Math.round(analysis.complexity), 1), 10);
      
      return {
        description: analysis.description,
        complexity: complexity
      };
    } catch (err) {
      console.error('Error parsing analysis response:', err);
      return { 
        description: "This code implements functionality relevant to the repository.",
        complexity: 5
      };
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

// Function to remove comments from code based on language
function removeComments(code: string, language: string): string {
  let result = '';
  
  switch (language.toLowerCase()) {
    case 'javascript':
    case 'javascript (react)':
    case 'typescript':
    case 'typescript (react)':
    case 'java':
    case 'c':
    case 'c++':
    case 'c#':
    case 'go':
    case 'rust':
    case 'php':
      // Remove multi-line comments (/* */)
      result = code.replace(/\/\*[\s\S]*?\*\//g, '');
      // Remove single-line comments (//)
      result = result.replace(/\/\/.*$/gm, '');
      break;
    
    case 'python':
    case 'ruby':
      // Remove multi-line docstrings (''' ''' or """ """)
      result = code.replace(/(['"])['"][^]*?\1\1/g, '');
      // Remove single-line comments (#)
      result = result.replace(/#.*$/gm, '');
      break;
    
    default:
      // For unknown languages, make a best effort to remove common comment styles
      result = code.replace(/\/\*[\s\S]*?\*\//g, ''); // C-style multi-line
      result = result.replace(/\/\/.*$/gm, '');    // C-style single-line
      result = result.replace(/#.*$/gm, '');       // Shell/Python style
      break;
  }
  
  // Remove consecutive blank lines (replace 2+ consecutive newlines with just 2)
  result = result.replace(/\n{3,}/g, '\n\n');
  
  // Remove blank lines at the beginning of the file
  result = result.replace(/^\s*\n+/, '');
  
  return result;
}

// Function to count non-comment, non-empty lines of code
function countCodeLines(code: string): number {
  // Split by newlines and filter out empty lines
  const lines = code.split('\n').filter(line => line.trim().length > 0);
  return lines.length;
}

// Keep track of repositories used in each game to avoid repeats
const gameRepoHistory: Record<string, string[]> = {};

export async function POST(request: Request) {
  try {
    // 新しいリクエスト開始時にGitHub API試行回数をリセット
    resetGithubApiAttempts();
    
    const { gameId, roundNumber } = await request.json();
    console.log(`[DEBUG] Creating round ${roundNumber} for game ${gameId}`);
    
    // Get game room details to check player IDs
    console.log(`[DEBUG] Fetching game room details for ${gameId}`);
    const { data: gameRoom, error: gameError } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('id', gameId)
      .single();
    
    if (gameError || !gameRoom) {
      console.error(`[ERROR] Game room not found: ${gameId}`, gameError);
      return NextResponse.json({ error: 'Game room not found' }, { status: 404 });
    }
    
    console.log(`[DEBUG] Found game room: ${gameRoom.id}, total rounds: ${gameRoom.total_rounds}`);
    
    // Initialize repo history for this game if it doesn't exist
    if (!gameRepoHistory[gameId]) {
      console.log(`[DEBUG] Initializing repo history for game ${gameId}`);
      gameRepoHistory[gameId] = [];
    }
    
    // Filter out repositories that have already been used in this game
    const availableRepos = popularRepos.filter(
      repo => !gameRepoHistory[gameId].includes(`${repo.owner}/${repo.repo}`)
    );
    
    console.log(`[DEBUG] ${availableRepos.length} repositories available out of ${popularRepos.length} total`);
    
    // If we've used all repositories or none are available, reset the history
    const repoPool = availableRepos.length > 0 ? availableRepos : popularRepos;
    console.log(`[DEBUG] Using pool of ${repoPool.length} repositories`);
    
    // Select a random repository from the available pool
    const randomRepoIndex = Math.floor(Math.random() * repoPool.length);
    const selectedRepo = repoPool[randomRepoIndex];
    
    // Add to history
    const repoKey = `${selectedRepo.owner}/${selectedRepo.repo}`;
    if (!gameRepoHistory[gameId].includes(repoKey)) {
      gameRepoHistory[gameId].push(repoKey);
      console.log(`[DEBUG] Added ${repoKey} to game history. History now has ${gameRepoHistory[gameId].length} repos`);
    }
    
    console.log(`[DEBUG] Round ${roundNumber}: Selected repo ${repoKey} (${selectedRepo.language})`);
    console.log(`[DEBUG] Game ${gameId} repo history:`, gameRepoHistory[gameId]);
    
    let codeData;
    let programDescription;
    let complexity;
    
    try {
      console.log(`[DEBUG] Attempting to get appropriate code from primary repo ${repoKey}`);
      // Try to get appropriate code from GitHub API
      const result = await getAppropriateCodeFile(selectedRepo.owner, selectedRepo.repo, 4);
      
      codeData = {
        content: result.content,
        url: result.url,
        path: result.path
      };
      programDescription = result.description;
      complexity = result.complexity;
      
      console.log(`[DEBUG] Successfully got code from primary repo ${repoKey}:`, {
        path: result.path,
        complexity: result.complexity,
        contentLength: result.content.length
      });
    } catch (error) {
      console.error(`[ERROR] Error fetching from GitHub API for primary repo ${repoKey}:`, error);
      console.log(`[DEBUG] Trying alternative repos...`);
      
      // Try with up to 5 different repositories instead of just 3
      const remainingRepos = [...repoPool].filter(repo => 
        `${repo.owner}/${repo.repo}` !== repoKey
      );
      
      console.log(`[DEBUG] ${remainingRepos.length} alternative repos available`);
      
      if (remainingRepos.length === 0) {
        console.error(`[ERROR] No alternative repositories available`);
        return NextResponse.json({ error: 'Failed to fetch code from any repository' }, { status: 500 });
      }
      
      // Try up to 5 different repositories
      const maxBackupRepos = Math.min(5, remainingRepos.length);
      let success = false;
      
      console.log(`[DEBUG] Will try up to ${maxBackupRepos} backup repositories`);
      
      for (let i = 0; i < maxBackupRepos && !success; i++) {
        // Select a different random repository
        const backupRepoIndex = Math.floor(Math.random() * remainingRepos.length);
        const backupRepo = remainingRepos.splice(backupRepoIndex, 1)[0]; // Remove the repo from the pool
        
        const backupRepoKey = `${backupRepo.owner}/${backupRepo.repo}`;
        console.log(`[DEBUG] Trying backup repo ${i+1}/${maxBackupRepos}: ${backupRepoKey} (${backupRepo.language})`);
        
        try {
          // Try to get code from the backup repository with progressively reduced requirements
          // Reduce complexity requirement more aggressively with each attempt
          const minComplexity = Math.max(2, 4 - Math.floor(i * 1.5)); 
          console.log(`[DEBUG] Using reduced complexity requirement: ${minComplexity} for backup ${i+1}`);
          
          const backupResult = await getAppropriateCodeFile(backupRepo.owner, backupRepo.repo, minComplexity);
          
          codeData = {
            content: backupResult.content,
            url: backupResult.url,
            path: backupResult.path
          };
          programDescription = backupResult.description;
          complexity = backupResult.complexity;
          
          console.log(`[DEBUG] Successfully got code from backup repo ${backupRepoKey}:`, {
            path: backupResult.path,
            complexity: backupResult.complexity,
            contentLength: backupResult.content.length
          });
          
          // Add backup repo to history if successful
          if (!gameRepoHistory[gameId].includes(backupRepoKey)) {
            gameRepoHistory[gameId].push(backupRepoKey);
            console.log(`[DEBUG] Added ${backupRepoKey} to game history`);
          }
          
          success = true;
        } catch (backupError) {
          console.error(`[ERROR] Error fetching from backup GitHub repo ${i+1} (${backupRepoKey}):`, backupError);
        }
      }
      
      // If still no success, try one last attempt with even more relaxed constraints
      if (!success && remainingRepos.length > 0) {
        console.log(`[DEBUG] Making one final attempt with minimal constraints...`);
        try {
          // Get a random repo from remaining ones
          const lastChanceRepoIndex = Math.floor(Math.random() * remainingRepos.length);
          const lastChanceRepo = remainingRepos[lastChanceRepoIndex];
          
          const lastChanceRepoKey = `${lastChanceRepo.owner}/${lastChanceRepo.repo}`;
          console.log(`[DEBUG] Last chance attempt with repo: ${lastChanceRepoKey}`);
          
          // Try with minimal complexity requirement and reduced line count
          const lastChanceResult = await getLastChanceCodeFile(lastChanceRepo.owner, lastChanceRepo.repo);
          
          codeData = {
            content: lastChanceResult.content,
            url: lastChanceResult.url,
            path: lastChanceResult.path
          };
          programDescription = lastChanceResult.description;
          complexity = lastChanceResult.complexity || 3; // Default to moderate complexity
          
          console.log(`[DEBUG] Successfully got code from last chance repo ${lastChanceRepoKey}:`, {
            path: lastChanceResult.path,
            complexity: lastChanceResult.complexity,
            contentLength: lastChanceResult.content.length
          });
          
          // Add to history
          if (!gameRepoHistory[gameId].includes(lastChanceRepoKey)) {
            gameRepoHistory[gameId].push(lastChanceRepoKey);
            console.log(`[DEBUG] Added ${lastChanceRepoKey} to game history`);
          }
          
          success = true;
        } catch (finalError) {
          console.error(`[ERROR] Final attempt failed:`, finalError);
        }
      }
      
      if (!success) {
        console.error(`[ERROR] Failed to fetch code from any repository after multiple attempts`);
        return NextResponse.json({ error: 'Failed to fetch code from any repository after multiple attempts' }, { status: 500 });
      }
    }
    
    // Ensure codeData exists before proceeding
    if (!codeData) {
      console.error(`[ERROR] No valid code data available after all attempts`);
      return NextResponse.json({ error: 'Failed to fetch valid code data' }, { status: 500 });
    }
    
    // Calculate time limit based on complexity (10-60 seconds)
    // More complex code = more time
    const baseTime = 30; // base seconds
    const complexityFactor = 10; // seconds per complexity point
    const timeLimit = baseTime + (complexity * complexityFactor);
    
    console.log(`[DEBUG] Setting time limit to ${timeLimit} seconds based on complexity ${complexity}`);
    
    // Create a new round
    console.log(`[DEBUG] Creating new round in database for game ${gameId}, round ${roundNumber}`);
    const { data: round, error: roundError } = await supabase
      .from('rounds')
      .insert({
        game_room_id: gameId,
        round_number: roundNumber,
        program_url: codeData.url,
        program_code: codeData.content,
        program_description: programDescription,
        path: codeData.path,
        time_limit: timeLimit,
        status: 'active',
      })
      .select()
      .single();
    
    if (roundError) {
      console.error(`[ERROR] Failed to create round in database:`, roundError);
      return NextResponse.json({ error: 'Failed to create round' }, { status: 500 });
    }
    
    console.log(`[DEBUG] Successfully created round ${round.id} for game ${gameId}`);
    
    // Clean up history for completed games
    if (roundNumber >= gameRoom.total_rounds) {
      console.log(`[DEBUG] Final round reached, cleaning up repo history for game ${gameId}`);
      delete gameRepoHistory[gameId];
    }
    
    return NextResponse.json({ success: true, round });
    
  } catch (error) {
    console.error(`[ERROR] Unhandled error in create-round:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Function to find code with appropriate complexity from a repo
async function getAppropriateCodeFile(owner: string, repo: string, minComplexity: number = 4) {
  console.log(`[DEBUG] Looking for code file with minimum complexity ${minComplexity} from ${owner}/${repo}`);
  
  // GitHubの試行回数をリセット（新しいリクエストの開始）
  resetGithubApiAttempts();
  
  try {
    const MAX_ATTEMPTS = 5;
    let attemptCount = 0;
    let bestFile: any = null;
    let bestComplexity = 0;
    
    while (attemptCount < MAX_ATTEMPTS) {
      attemptCount++;
      console.log(`[DEBUG] Attempt ${attemptCount}/${MAX_ATTEMPTS} to find appropriate code file`);
      
      try {
        // Get a random file from the repo
        const codeFile = await getRandomCodeFile(owner, repo);
        
        // Detect language from file path
        const language = getLanguageFromPath(codeFile.path);
        console.log(`[DEBUG] Found file ${codeFile.path} with language ${language}`);
        
        // Clean code (remove comments)
        const cleanCode = removeComments(codeFile.content, language);
        
        // Count actual code lines (excluding comments and blank lines)
        const codeLineCount = countCodeLines(cleanCode);
        console.log(`[DEBUG] File has ${codeLineCount} lines of code`);
        
        // Skip files that are too short
        if (codeLineCount < 10) {
          console.log(`[DEBUG] File too short (${codeLineCount} lines), skipping`);
          continue;
        }
        
        // Skip files that are too long
        if (codeLineCount > 200) {
          console.log(`[DEBUG] File too long (${codeLineCount} lines), skipping`);
          continue;
        }
        
        // Analyze the code to get a complexity score
        const analysis = await analyzeCode(codeFile.content, codeFile.path, language);
        console.log(`[DEBUG] Analysis for ${codeFile.path}:`, analysis);
        
        // Check if this file meets our requirements
        if (analysis.complexity >= minComplexity) {
          console.log(`[DEBUG] Found suitable file on attempt ${attemptCount}: ${codeFile.path} (complexity: ${analysis.complexity})`);
          return {
            ...codeFile,
            description: analysis.description,
            complexity: analysis.complexity
          };
        }
        
        // Keep track of the best file we've found so far
        if (analysis.complexity > bestComplexity) {
          bestFile = {
            ...codeFile,
            description: analysis.description,
            complexity: analysis.complexity
          };
          bestComplexity = analysis.complexity;
          console.log(`[DEBUG] New best file: ${codeFile.path} (complexity: ${analysis.complexity})`);
        }
      } catch (attemptError) {
        console.error(`[ERROR] Error in attempt ${attemptCount}:`, attemptError);
        
        // Check if the error is due to GitHub API rate limit
        if (attemptError instanceof Error && attemptError.message && attemptError.message.includes('rate limit exceeded')) {
          console.log(`[DEBUG] GitHub API rate limit exceeded, trying to use cached files`);
          
          // Try to get a random cached file
          const cachedFile = await getRandomCachedFile();
          if (cachedFile) {
            console.log(`[DEBUG] Successfully retrieved random cached file as fallback`);
            const language = getLanguageFromPath(cachedFile.path);
            const analysis = await analyzeCode(cachedFile.content, cachedFile.path, language);
            
            return {
              ...cachedFile,
              description: analysis.description,
              complexity: analysis.complexity || 4 // Default to minimal complexity if analysis fails
            };
          }
          
          // If we can't get a cached file, rethrow the error
          throw attemptError;
        }
      }
    }
    
    // If we couldn't find a file that meets the minimum complexity,
    // return the best file we found (or throw an error if we didn't find any)
    if (bestFile) {
      console.log(`[DEBUG] Couldn't find file meeting minimum complexity ${minComplexity}, using best found: ${bestFile.path} (complexity: ${bestComplexity})`);
      return bestFile;
    }
    
    console.error(`[ERROR] Failed to find any suitable code files after ${MAX_ATTEMPTS} attempts`);
    throw new Error(`Failed to find suitable code after ${MAX_ATTEMPTS} attempts`);
  } catch (error) {
    console.error(`[ERROR] Error in getAppropriateCodeFile:`, error);
    
    // Check if the error is due to GitHub API rate limit or attempt limit
    if ((error instanceof Error && error.message && error.message.includes('rate limit exceeded')) ||
        (error instanceof Error && error.message && error.message.includes('API attempt limit'))) {
      console.log(`[DEBUG] GitHub API issue, trying to use cached files`);
      
      // Try to get a random cached file
      const cachedFile = await getRandomCachedFile();
      if (cachedFile) {
        console.log(`[DEBUG] Successfully retrieved random cached file as fallback`);
        const language = getLanguageFromPath(cachedFile.path);
        const analysis = await analyzeCode(cachedFile.content, cachedFile.path, language);
        
        return {
          ...cachedFile,
          description: analysis.description,
          complexity: analysis.complexity || 4 // Default to minimal complexity if analysis fails
        };
      }
    }
    
    throw error;
  }
}

// Fallback function for finding any valid code when all else fails
async function getLastChanceCodeFile(owner: string, repo: string) {
  console.log(`[DEBUG] Last chance attempt for ${owner}/${repo} with minimal requirements`);
  
  for (let attempt = 0; attempt < 5; attempt++) {
    console.log(`[DEBUG] Last chance attempt ${attempt+1}/5 for ${owner}/${repo}`);
    
    try {
      // Get any code file we can find
      const codeData = await getRandomCodeFile(owner, repo);
      console.log(`[DEBUG] Last chance retrieved file: ${codeData.path}`);
      
      // Get the language from the file path
      const language = getLanguageFromPath(codeData.path);
      console.log(`[DEBUG] Detected language: ${language}`);
      
      // Remove comments from the code
      const cleanCode = removeComments(codeData.content, language);
      
      // Count non-comment lines
      const codeLineCount = countCodeLines(cleanCode);
      console.log(`[DEBUG] Last chance file ${codeData.path} has ${codeLineCount} lines of code`);
      
      // Accept any file with at least 50 lines
      if (codeLineCount >= 50) {
        console.log(`[DEBUG] Last chance found acceptable file ${codeData.path} with ${codeLineCount} lines`);
        
        // Simple description if we can't get an AI analysis
        let description = "This code implements functionality relevant to the repository.";
        let complexity = 3; // Default moderate complexity
        
        try {
          // Try to get analysis but don't fail if it doesn't work
          console.log(`[DEBUG] Attempting to analyze last chance file ${codeData.path}`);
          const analysis = await analyzeCode(cleanCode, codeData.path, language);
          description = analysis.description;
          complexity = analysis.complexity;
          console.log(`[DEBUG] Last chance analysis successful: complexity=${complexity}`);
        } catch (analysisError) {
          console.error(`[ERROR] Failed to analyze last chance file, using default description:`, analysisError);
        }
        
        return {
          ...codeData,
          content: cleanCode,
          description,
          complexity
        };
      } else {
        console.log(`[DEBUG] Last chance file ${codeData.path} too short (${codeLineCount} < 50), trying again`);
      }
    } catch (error) {
      console.error(`[ERROR] Last chance attempt ${attempt + 1} failed for ${owner}/${repo}:`, error);
      if (attempt === 4) {
        console.error(`[ERROR] All last chance attempts exhausted for ${owner}/${repo}`);
        throw error;
      }
    }
  }
  
  console.error(`[ERROR] Even last chance attempts failed for ${owner}/${repo}`);
  throw new Error('Even last chance attempts failed to find suitable code');
}