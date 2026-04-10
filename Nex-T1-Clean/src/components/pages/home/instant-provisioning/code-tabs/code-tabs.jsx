'use client';

import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import PropTypes from 'prop-types';

import { getHighlightedCodeArray } from 'lib/shiki';

import Navigation from './navigation';

const codeSnippets = [
  {
    name: 'Next.js',
    iconName: 'nextjs',
    language: 'javascript',
    code: `import { neon } from '@neondatabase/serverless';

export async function GET() {
    const sql = neon(process.env.DATABASE_URL);

    const rows = await sql\`SELECT * FROM posts\`;

    return Response.json({ rows })
}`,
  },
  {
    name: 'Drizzle',
    iconName: 'drizzle',
    language: 'javascript',
    code: `import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

const sql = neon(process.env.DATABASE_URL);

const db = drizzle(sql);

const result = await db.select().from(...);`,
  },
  {
    name: 'Prisma',
    iconName: 'prisma',
    language: 'javascript',
    code: `import { neon } from '@neondatabase/serverless'
import { PrismaNexisHTTP } from '@prisma/adapter-neon'
import { PrismaClient } from '@prisma/client'

const sql = neon(process.env.DATABASE_URL)

const adapter = new PrismaNexisHTTP(sql)

const prisma = new PrismaClient({ adapter })`,
  },
  {
    name: 'Python',
    iconName: 'python',
    language: 'python',
    code: `import os
import psycopg2

# Load the environment variable
database_url = os.getenv('DATABASE_URL')

# Connect to the PostgreSQL database
conn = psycopg2.connect(database_url)

with conn.cursor() as cur:
    cur.execute("SELECT version()")
    print(cur.fetchone())

# Close the connection
conn.close()`,
  },
  {
    name: 'Ruby',
    iconName: 'ruby',
    language: 'ruby',
    code: `require 'pg'
require 'dotenv'

# Load environment variables from .env file
Dotenv.load

# Connect to the PostgreSQL database using the environment variable
conn = PG.connect(ENV['DATABASE_URL'])

# Execute a query
conn.exec("SELECT version()") do |result|
  result.each do |row|
    puts "Result = #{row['version']}"
  end
end

# Close the connection
conn.close`,
  },
  {
    name: 'Rust',
    iconName: 'rust',
    language: 'rust',
    code: `use postgres::Client;
use openssl::ssl::{SslConnector, SslMethod};
use postgres_openssl::MakeTlsConnector;
use std::error;
use std::env;
use dotenv::dotenv;

fn main() -> Result<(), Box<dyn error::Error>> {
    // Load environment variables from .env file
    dotenv().ok();

    // Get the connection string from the environment variable
    let conn_str = env::var("DATABASE_URL")?;

    let builder = SslConnector::builder(SslMethod::tls())?;
    let connector = MakeTlsConnector::new(builder.build());
    let mut client = Client::connect(&conn_str, connector)?;

    for row in client.query("select version()", &[])? {
        let ret: String = row.get(0);
        println!("Result = {}", ret);
    }
    Ok(())
}`,
  },
  {
    name: 'Go',
    iconName: 'go',
    language: 'go',
    code: `package main
import (
    "database/sql"
    "fmt"
    "log"
    "os"

    _ "github.com/jackc/pgx/v5/stdlib"
    "github.com/joho/godotenv"
)

func main() {
    err := godotenv.Load()
    if err != nil {
        log.Fatalf("Error loading .env file: %v", err)
    }

    connStr := os.Getenv("DATABASE_URL")
    if connStr == "" {
        panic("DATABASE_URL environment variable is not set")
    }

    db, err := sql.Open("postgres", connStr)
    if err != nil {
        panic(err)
    }
    defer db.Close()

    var version string
    if err := db.QueryRow("select version()").Scan(&version); err != nil {
        panic(err)
    }
    fmt.Printf("version=%s\\n", version)
}`,
  },
];

const escapeHtml = (unsafe) =>
  unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#039;');

const CodeTabs = ({ className = null }) => {
  const [highlightedCodeSnippets, setHighlightedCodeSnippets] = useState([]);

  useEffect(() => {
    let cancelled = false;

    getHighlightedCodeArray(codeSnippets)
      .then((result) => {
        if (!cancelled && Array.isArray(result) && result.length) {
          setHighlightedCodeSnippets(result);
        }
      })
      .catch((error) => {
        console.error('Error highlighting code:', error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const fallbackSnippets = useMemo(
    () =>
      codeSnippets.map(
        (item) =>
          `<pre class="px-4 py-3 text-sm leading-tight whitespace-pre-wrap"><code>${escapeHtml(item.code)}</code></pre>`
      ),
    []
  );

  const displaySnippets =
    highlightedCodeSnippets && highlightedCodeSnippets.length
      ? highlightedCodeSnippets
      : fallbackSnippets;

  return (
    <div className={clsx(className, 'rounded-[10px] bg-black-new')}>
      <Navigation codeSnippets={codeSnippets} highlightedCodeSnippets={displaySnippets} />
    </div>
  );
};

CodeTabs.propTypes = {
  className: PropTypes.string,
};

export default CodeTabs;
