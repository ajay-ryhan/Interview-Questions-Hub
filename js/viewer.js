const params =
    new URLSearchParams(
        window.location.search
    );

const file =
    decodeURIComponent(
        params.get("file") || ""
    );

const title =
    document.getElementById(
        "document-title"
    );

const viewer =
    document.getElementById(
        "viewer-content"
    );

if (!file) {

    title.textContent =
        "Document Not Found";

} else {

    title.textContent =
        file.split("/").pop();

    const path =
        "./docs/" + file;

    const ext =
        file
            .split(".")
            .pop()
            .toLowerCase();

    switch (ext) {

        case "pdf":

            viewer.innerHTML = `
                <iframe
                    src="${path}"
                    width="100%"
                    height="900">
                </iframe>
            `;
            break;

        case "jpg":
        case "jpeg":
        case "png":
        case "gif":
        case "webp":

            viewer.innerHTML = `
                <img
                    src="${path}"
                    style="
                        max-width:100%;
                        border-radius:12px;
                    "
                />
            `;
            break;

        case "txt":

            fetch(path)
                .then(r => r.text())
                .then(text => {

                    viewer.innerHTML =
                        `<pre>${text}</pre>`;
                });

            break;

        case "doc":
        case "docx":
        case "ppt":
        case "pptx":
        case "xls":
        case "xlsx":

            const officeViewer =
                "https://view.officeapps.live.com/op/view.aspx?src=" +
                encodeURIComponent(
                    window.location.origin +
                    "/docs/" +
                    file
                );

            viewer.innerHTML = `
                <iframe
                    src="${officeViewer}"
                    width="100%"
                    height="900">
                </iframe>
            `;
            break;

        default:

            viewer.innerHTML = `
                <p>
                    Preview not available.
                </p>

                <a
                    href="${path}"
                    download>
                    Download File
                </a>
            `;
    }
}