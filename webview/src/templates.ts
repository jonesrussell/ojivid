/// <reference types="vite/client" />
/// <reference lib="dom" />

interface ViewData {
    content: string;
}

export class Template {
    private static templates: Map<string, string> = new Map();

    static register(name: string, template: string): void {
        this.templates.set(name, template);
    }

    static render(name: string, data: ViewData): string {
        const template = this.templates.get(name);
        if (!template) {
            throw new Error(`Template '${name}' not found`);
        }

        return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
            return data[key as keyof ViewData] || '';
        });
    }
}

// Register templates
Template.register('layout', `
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#1a1a1a">
    <title>Ojiosk</title>
    <link rel="icon" type="image/svg+xml"
        href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📹</text></svg>">
    <link rel="stylesheet" href="styles.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>

<body>
    <div class="app">
        <header class="header">
            <h1>Ojiosk</h1>
        </header>

        <main class="main">
            {{content}}
        </main>

        <footer class="footer">
            <p>© 2025 Ojiosk</p>
        </footer>
    </div>
    <script type="module" src="main.ts"></script>
</body>

</html>
`);

Template.register('camera', `
<div class="camera-container">
    <div class="camera-selector"></div>
    <div class="video-container"></div>
    <div class="camera-controls"></div>
</div>
`);

// Helper function to create a view
export function createView(name: string, data: ViewData): HTMLElement {
    const template = Template.render(name, data);
    const div = document.createElement('div');
    div.innerHTML = template;
    return div.firstElementChild as HTMLElement;
} 