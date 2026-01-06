document.addEventListener("DOMContentLoaded", () => {
    // --- Elements ---
    const searchModal = document.getElementById("search-modal");
    const closeSearchBtn = document.getElementById("close-search-modal");
    const searchBackdrop = document.getElementById("search-modal-backdrop");
    const searchContent = document.getElementById("search-modal-content");

    // Open Buttons (Handle multiple possible triggers)
    const openSearchBtns = document.querySelectorAll(".open-search-modal-btn");

    const searchInput = document.getElementById("student-search-input");
    const searchResults = document.getElementById("search-results");
    const searchLoader = document.getElementById("search-loader");
    const searchEmpty = document.getElementById("search-empty");
    const searchDefault = document.getElementById("search-default");

    let debounceTimer;

    // --- Functions ---

    function openModal() {
        if (!searchModal) return;
        searchModal.classList.remove("hidden");
        // Animation
        setTimeout(() => {
            searchBackdrop.classList.remove("opacity-0");
            searchContent.classList.remove("translate-y-full");
        }, 10);

        // Focus input
        setTimeout(() => {
            if (searchInput) searchInput.focus();
        }, 300);
    }

    function closeModal() {
        if (!searchModal) return;
        searchBackdrop.classList.add("opacity-0");
        searchContent.classList.add("translate-y-full");

        setTimeout(() => {
            searchModal.classList.add("hidden");
            // Reset state
            if (searchInput) searchInput.value = "";
            renderState("default");
        }, 300);
    }

    function renderState(state) {
        if (searchLoader) searchLoader.classList.add("hidden");
        if (searchEmpty) searchEmpty.classList.add("hidden");
        if (searchResults) searchResults.classList.add("hidden");
        if (searchDefault) searchDefault.classList.add("hidden");

        if (state === "loading" && searchLoader) searchLoader.classList.remove("hidden");
        else if (state === "empty" && searchEmpty) searchEmpty.classList.remove("hidden");
        else if (state === "results" && searchResults) searchResults.classList.remove("hidden");
        else if (state === "default" && searchDefault) searchDefault.classList.remove("hidden");
    }

    function renderResults(data) {
        if (!searchResults) return;
        searchResults.innerHTML = "";

        if (data.results.length === 0) {
            renderState("empty");
            return;
        }

        const hideNis = searchResults.dataset.hideNis === "true";

        data.results.forEach(student => {
            const statusColor = getStatusColor(student.status_hari_ini);

            const detailText = hideNis
                ? student.nama_kelas
                : `${student.nama_kelas} • ${student.nis}`;

            const item = document.createElement("div");
            item.className = "flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100";
            item.innerHTML = `
                <div class="size-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs shadow-sm">
                    ${getInitials(student.nama_lengkap)}
                </div>
                <div class="flex-1 min-w-0">
                    <h4 class="text-slate-900 font-bold text-sm truncate">${student.nama_lengkap}</h4>
                    <p class="text-[10px] text-slate-500 font-medium">
                        ${detailText}
                    </p>
                </div>
                <div class="flex flex-col items-end gap-1">
                    <span class="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${statusColor.bg} ${statusColor.text} border ${statusColor.border}">
                        ${student.status_hari_ini}
                    </span>
                    <span class="text-[10px] text-slate-400 font-medium">${student.waktu_absen || '--:--'}</span>
                </div>
            `;
            searchResults.appendChild(item);
        });

        renderState("results");
    }

    function getStatusColor(status) {
        switch (status) {
            case 'Hadir': return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' };
            case 'Sakit': return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' };
            case 'Izin': return { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' };
            case 'Alpha': return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' };
            default: return { bg: 'bg-slate-100', text: 'text-slate-500', border: 'border-slate-200' };
        }
    }

    function getInitials(name) {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();
    }

    async function performSearch(query) {
        if (!query) {
            renderState("default");
            return;
        }

        renderState("loading");

        try {
            const response = await fetch(`/api/cari_santri?q=${encodeURIComponent(query)}`);
            const data = await response.json();

            if (data.success) {
                renderResults(data);
            } else {
                // If API returns success: false but handled
                renderState("empty");
            }
        } catch (error) {
            console.error("Search failed:", error);
            renderState("empty");
        }
    }

    // --- Event Listeners ---

    // Open Modal
    openSearchBtns.forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            openModal();
        });
    });

    // Close Modal
    if (closeSearchBtn) closeSearchBtn.addEventListener("click", closeModal);
    if (searchBackdrop) searchBackdrop.addEventListener("click", closeModal);

    // Search Input
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            clearTimeout(debounceTimer);
            const query = e.target.value.trim();

            debounceTimer = setTimeout(() => {
                performSearch(query);
            }, 500); // 500ms debounce
        });
    }
});
