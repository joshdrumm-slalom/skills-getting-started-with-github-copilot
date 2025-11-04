document.addEventListener("DOMContentLoaded", () => {
  // Helper: select elements
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Fetch and render activities
  async function fetchActivities() {
    activitiesList.innerHTML = '<p>Loading activities...</p>';
    activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

    try {
      const res = await fetch("/activities");
      if (!res.ok) throw new Error(`Failed to load activities (${res.status})`);
      const activities = await res.json();

      // Clear list
      activitiesList.innerHTML = "";

      // Build option list
      Object.keys(activities).forEach((activityName) => {
        const opt = document.createElement("option");
        opt.value = activityName;
        opt.textContent = activityName;
        activitySelect.appendChild(opt);
      });

      // Render activity cards (preserve sort order by name)
      Object.entries(activities).sort().forEach(([name, info]) => {
        const card = document.createElement("div");
        card.className = "activity-card";

        const title = document.createElement("h4");
        title.textContent = name;
        card.appendChild(title);

        // Use a definition list for activity details instead of <p>/<strong>
        const details = document.createElement("dl");
        details.className = "activity-details";

        function addDetail(label, content, valueClass) {
          const dt = document.createElement("dt");
          dt.className = "detail-term";
          dt.textContent = label;

          const dd = document.createElement("dd");
          dd.className = valueClass || "detail-value";
          if (content instanceof Node) dd.appendChild(content);
          else dd.textContent = content;

          details.appendChild(dt);
          details.appendChild(dd);
          return dd;
        }

        // Description
        addDetail("Description", info.description || "", "detail-description");

        // Schedule / When
        addDetail("When", info.schedule || "TBD", "detail-schedule");

        // Capacity -> show available slots only (no title attributes)
        const current = Array.isArray(info.participants) ? info.participants.length : 0;
        const max = Number.isFinite(info.max_participants) ? info.max_participants : 0;
        const available = Math.max(0, max - current);
        addDetail("Available Slots", String(available), "participant-count");

        // Participants list (ul will be attached inside the dd)
        const ul = document.createElement("ul");
        ul.className = "participants-list";

        if (Array.isArray(info.participants) && info.participants.length > 0) {
          // only render participants list when there is at least one participant
          info.participants.forEach((p) => {
            const li = document.createElement("li");
            li.className = "participant";

            // participant name span
            const nameSpan = document.createElement("span");
            nameSpan.className = "participant-name";
            nameSpan.textContent = p;
            li.appendChild(nameSpan);

            // delete button
            const delBtn = document.createElement("button");
            delBtn.className = "delete-btn";
            delBtn.type = "button";
            delBtn.innerHTML = "✕";

            delBtn.addEventListener("click", async () => {
              if (!confirm(`Remove ${p} from ${name}?`)) return;
              try {
                const url = `/activities/${encodeURIComponent(name)}/participants?email=${encodeURIComponent(p)}`;
                const res = await fetch(url, { method: "DELETE" });
                const json = await res.json();
                if (res.ok) {
                  showMessage(json.message || `Removed ${p}`, "success");
                  await fetchActivities();
                } else {
                  showMessage(json.detail || json.message || "Failed to remove participant", "error");
                }
              } catch (err) {
                showMessage(`Network error: ${err.message}`, "error");
              }
            });

            li.appendChild(delBtn);
            ul.appendChild(li);
          });

          // attach participants list inside the details and then append details to card
          addDetail("Participants", ul, "detail-participants");
        }

        card.appendChild(details);

        activitiesList.appendChild(card);
      });

    } catch (err) {
      activitiesList.innerHTML = `<p class="error">Could not load activities: ${err.message}</p>`;
    }
  }

  // Signup handler
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const activityName = activitySelect.value;

    // basic validation
    if (!email || !activityName) {
      showMessage("Please provide both email and an activity.", "error");
      return;
    }

    try {
      // POST with email as a query param to match backend signature
      const url = `/activities/${encodeURIComponent(activityName)}/signup?email=${encodeURIComponent(email)}`;
      const res = await fetch(url, { method: "POST" });
      const json = await res.json();

      if (res.ok) {
        showMessage(json.message || "Signed up successfully!", "success");
        signupForm.reset();
        // Refresh activities to show updated participants list
        await fetchActivities();
      } else {
        // show backend error message
        showMessage(json.detail || json.message || "Signup failed", "error");
      }
    } catch (err) {
      showMessage(`Network error: ${err.message}`, "error");
    }
  });

  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
  }

  // Initialize
  fetchActivities();
});
