# Markdown to JSON Converter

This application converts Markdown text to a structured JSON format. The converter supports various Markdown elements and offers formatting options.

## Features and Usage

### Markdown Node Conversion
The converter supports the following Markdown elements:
- [x] Headings (h1-h6)
- [x] Paragraphs with text formatting (bold, italic, strikethrough)
- [ ] Links and images (image has not been checked due to PATH.)
- [x] Code blocks with language highlighting
- [x] Ordered and unordered lists
- [ ] Task lists with checkboxes (Haven't checked yet)
- [ ] Tables (Probably.Haven't checked yet.)
- [ ] Blockquotes (Haven't checked yet)
- [ ] Math equations (inline and block) (Haven't checked yet)
- [ ] GitHub Flavored Markdown (GFM) (Haven't checked yet)

### JSON Format Options
You can choose between two JSON output formats:
1. Quoted property names: `{"type": "text", "content": "hello"}`
2. Unquoted property names: `{type: "text", content: "hello"}`

### How to Use
1. Enter or paste your Markdown text in the left input area
2. Select your preferred JSON format (quoted/unquoted)
3. Click the "Convert" button
4. The converted JSON will appear in the right panel
5. Use the "Copy" button to copy the JSON to your clipboard


## About React Router v7

React Router is the standard routing library for React applications. [React Router v7](https://reactrouter.com/) provides a simpler and more powerful API.

## Setup Instructions

### 1. Clone Repository

```bash
git clone https://github.com/andtopic/test_converter_md2json.git
```

### 2. Devcontainer Setup
This project provides a development environment using VS Code's Devcontainer. Follow the steps below to set up.

Open the project in VS Code.
Click the "><" icon in the bottom left and select "Reopen in Container".
### 3. Install Dependencies
Run the following command inside the container to install dependencies.

```bash
npm install
```

### 4. Start Development Server
Run the following command to start the development server.

```bash
npm run dev
```

### 5. Check Application in Browser
Access the application in your browser at the following URL.

http://localhost:5137
vite.config.ts Host Specification
In the vite.config.ts file, the host and port for the development server are specified. Check the following settings.

```ts
// filepath: /home/tom/projects/my-own-product/test-react-router/vite.config.ts
// ...existing code...
server: {
  host: true,
  port: 5137,
  strictPort: true,
  watch: {
    usePolling: true,
  }
}
// ...existing code...
```

This setting makes the development server accessible on port 5137.


