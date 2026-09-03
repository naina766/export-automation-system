// Export Automation System UI Scripts
document.addEventListener("DOMContentLoaded", function () {
  // Dropzone drag-and-drop handling
  const dropzone = document.getElementById("csv-dropzone");
  const fileInput = document.getElementById("csv-file-input");
  const fileNameDisplay = document.getElementById("selected-file-name");

  if (dropzone && fileInput) {
    dropzone.addEventListener("click", () => fileInput.click());

    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.style.borderColor = "var(--accent-blue)";
      dropzone.style.backgroundColor = "rgba(59, 130, 246, 0.08)";
    });

    dropzone.addEventListener("dragleave", () => {
      dropzone.style.borderColor = "var(--border-light)";
      dropzone.style.backgroundColor = "rgba(255, 255, 255, 0.01)";
    });

    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.style.borderColor = "var(--border-light)";
      dropzone.style.backgroundColor = "rgba(255, 255, 255, 0.01)";
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        fileInput.files = e.dataTransfer.files;
        if (fileNameDisplay) {
          fileNameDisplay.textContent = `Selected: ${e.dataTransfer.files[0].name}`;
        }
      }
    });

    fileInput.addEventListener("change", () => {
      if (fileInput.files.length > 0 && fileNameDisplay) {
        fileNameDisplay.textContent = `Selected: ${fileInput.files[0].name}`;
      }
    });
  }

  // Quick load demo buyers helper
  const loadDemoBtn = document.getElementById("load-demo-data-btn");
  if (loadDemoBtn) {
    loadDemoBtn.addEventListener("click", async function () {
      loadDemoBtn.textContent = "Loading Demo Data...";
      loadDemoBtn.disabled = true;
      try {
        const response = await fetch("/load-demo-data", { method: "POST" });
        const data = await response.json();
        if (data.success) {
          window.location.href = "/upload?success=demo_loaded";
        } else {
          alert("Error loading demo data: " + data.message);
          loadDemoBtn.textContent = "Load Sample Demo CSV";
          loadDemoBtn.disabled = false;
        }
      } catch (err) {
        alert("Request failed: " + err);
        loadDemoBtn.textContent = "Load Sample Demo CSV";
        loadDemoBtn.disabled = false;
      }
    });
  }
});
