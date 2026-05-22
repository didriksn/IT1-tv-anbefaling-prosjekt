// https://api.tvmaze.com/search/shows?q=

let seriesList = document.getElementById('series-list');
let searchInput = document.getElementById('series-search');
let seriesSearchButton = document.getElementById('series-search-btn');

function formatSummary(summary) {
    return summary ? summary.replace(/<[^>]*>/g, '') : 'No summary available.';
}

function ensurePopup(showName, showSummary) {
    let popup = document.getElementById('show-popup');

    if (popup) {
        popup.querySelector('#show-popup-title').textContent = showName;
        popup.querySelector('#show-popup-summary').textContent = formatSummary(showSummary);
        const popupSearch = popup.querySelector('#popup-search');
        if (popupSearch) {
            popupSearch.value = '';
        }
        return popup;
    }

    popup = document.createElement('div');
    popup.id = 'show-popup';
    popup.className = 'popup-overlay';
    popup.innerHTML = `
        <div class="popup-card" role="dialog" aria-modal="true" aria-labelledby="show-popup-title">
            <button type="button" class="popup-close" aria-label="Close popup">&times;</button>
            <div class="popup-grid">
                <h2 id="show-popup-title">${showName}</h2>
                <div class="popup-summary" id="show-popup-summary">${formatSummary(showSummary)}</div>
                <div class="popup-comment-input">
                    <form id="popup-comment-form">
                        <label for="popup-search">Legg til kommentar:</label>
                        <input type="text" id="popup-search" placeholder="Kommenter..." autocomplete="off"></input>

                        <label for="popup-stars">Stjerner:</label>
                        <select id="popup-stars">
                            <option value="0">Legg til vurdering</option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                            <option value="4">4</option>
                            <option value="5">5</option>
                        </select>

                        <button type="submit">Legg til kommentar</button>
                    </form>
                </div>
                <div class="popup-comments" aria-label="Comments section">
                    <p>Comments will appear here.</p>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(popup);

    const popupCommentForm = popup.querySelector('#popup-comment-form');
    const popupStars = popup.querySelector('#popup-stars');

    if (popupCommentForm && popupStars) {
        popupCommentForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const commentInput = popupCommentForm.querySelector('#popup-search');
            const commentText = commentInput.value.trim();

            if (popupStars.value === '0') {
                alert('Vennligst velg en stjernevurdering før du legger til en kommentar.');
                return;
            }

            console.log(`User ${currentUser} commented: "${commentText}" with ${popupStars.value} stars on show "${showName}"`);

             commentInput.value = '';
             popupStars.value = '0';
        });
    }

    popup.addEventListener('click', (event) => {
        if (event.target === popup || event.target.classList.contains('popup-close')) {
            popup.classList.remove('open');
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            popup.classList.remove('open');
        }
    });

    return popup;
}

function openPopup(showName, showSummary) {
    const popup = ensurePopup(showName, showSummary);
    popup.classList.add('open');
}

function isPopupOpen() {
    const popup = document.getElementById('show-popup');
    return popup && popup.classList.contains('open');
}

function searchShows(query) {
    seriesList.replaceChildren();

    fetch(`https://api.tvmaze.com/search/shows?q=${query}`)
        .then(response => response.json())
        .then(data => {
            data.forEach(item => {
                let show = item.show;
                let showElement = document.createElement('div');
                showElement.classList.add('show');
                let title = document.createElement('h3');
                title.textContent = show.name;

                let summary = document.createElement('p');
                summary.textContent = show.summary ? show.summary.replace(/<[^>]*>/g, '') : 'No summary available.';

                showElement.replaceChildren(title, summary);
                seriesList.appendChild(showElement);

                showElement.addEventListener('click', () => {
                    openPopup(show.name, show.summary);
                });
            });
        });
}

seriesSearchButton.addEventListener('click', () => {
    searchShows(searchInput.value);
});

document.body.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !isPopupOpen()) {
        searchShows(searchInput.value);
    }
});

let currentUser = 1;

const userSelect = document.getElementById("userSelect");

userSelect.addEventListener("change", () => {
  currentUser = userSelect.value;
  console.log(currentUser);
});