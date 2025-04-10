# Welcome to NoteSage, your open source document chat project

## Project info

**URL**: [\[NoteSage Github\]](https://github.com/Aimino-Tech/notesage)
**Hosted Preview**: [\[NoteSage Demo\]](https://app.aimino.de/notesage)

NoteSage allows you to chat with your documents using custom models. It is designed to be self-hosted, giving you full control over your data and models.

## How can I edit this code?

There are several ways of editing your application.

Simply clone this repository and run it locally to start chatting with your documents.

Changes made locally will need to be committed and pushed to your repository.

**Use your preferred IDE**

If you want to work locally using your own IDE, clone this repo and push changes.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone git@github.com:Aimino-Tech/notesage.git

# Step 2: Navigate to the project directory.
cd notesage

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for NoteSage?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

To deploy NoteSage, you will need to build and host the application yourself. Refer to the documentation for detailed deployment instructions.

### Using Docker

You can also deploy NoteSage using Docker.

1.  **Build the Docker image:**
    Make sure you have Docker installed and running. Navigate to the project's root directory in your terminal and run:
    ```sh
    docker build -t notesage .
    ```
    This command builds the Docker image using the `Dockerfile` in the current directory and tags it as `notesage`.

2.  **Run the Docker container:**
    Once the image is built, you can run it as a container:
    ```sh
    docker run -p 8080:80 notesage
    ```
    This command starts a container from the `notesage` image. It maps port 8080 on your host machine to port 80 inside the container (where Nginx is serving the application).

3.  **Access the application:**
    Open your web browser and navigate to `http://localhost:8080`. You should see the NoteSage application running.

## I want to use a custom domain - is that possible?

Custom domains are not directly supported in this open-source version. You will need to configure your hosting provider to use a custom domain.
