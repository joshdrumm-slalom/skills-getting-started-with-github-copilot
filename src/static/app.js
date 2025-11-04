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

        const desc = document.createElement("p");
        desc.textContent = info.description || "";
        card.appendChild(desc);

        const schedule = document.createElement("p");
        schedule.innerHTML = `<strong>When:</strong> ${info.schedule || "TBD"}`;
        card.appendChild(schedule);

        const capacity = document.createElement("p");
        const current = Array.isArray(info.participants) ? info.participants.length : 0;
        capacity.innerHTML = `<strong>Capacity:</strong> ${current} / ${info.max_participants || "—"}`;
        capacity.className = "participant-count";
        card.appendChild(capacity);

        // Participants list section
        const participantsHeading = document.createElement("p");
        participantsHeading.innerHTML = `<strong>Participants:</strong>`;
        card.appendChild(participantsHeading);

        const ul = document.createElement("ul");
        ul.className = "participants-list";

        if (Array.isArray(info.participants) && info.participants.length > 0) {
          info.participants.forEach((p) => {
            const li = document.createElement("li");
            li.className = "participant";
            li.textContent = p;
            ul.appendChild(li);
          });
        } else {
          const li = document.createElement("li");
          li.className = "participant empty";
          li.textContent = "No one has signed up yet.";
          ul.appendChild(li);
        }

        card.appendChild(ul);

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
