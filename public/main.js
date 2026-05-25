// https://api.tvmaze.com/search/shows?q=

let seriesList = document.getElementById('series-list');
let searchInput = document.getElementById('series-search');
let seriesSearchForm = document.getElementById('series-search-form');

let currentUser = 1;
const apiBaseUrl = "http://localhost:5501";

const userSelect = document.getElementById("userSelect");
let lastFocusedElement = null;

function getCurrentUserId() {
    return Number(userSelect.value);
}

function renderReviewList(popup, reviews) {
    const commentsSection = popup.querySelector('.popup-comments');
    if (!commentsSection) {
        return;
    }

    const activeUserId = getCurrentUserId();

    if (!reviews.length) {
        commentsSection.innerHTML = '<p>Ingen anmeldelser enda.</p>';
        return;
    }

    commentsSection.innerHTML = reviews.map((review) => {
        const reviewerName = review.user_name || `Bruker ${review.user_id}`;
        const starCount = Number(review.stars) || 0;
        const starLabel = starCount === 1 ? 'stjerne' : 'stjerner';
        const canDelete = Number(review.user_id) === activeUserId;
        const deleteButton = canDelete
            ? `<button type="button" class="popup-comment-delete" data-review-id="${review.id}">slett</button>`
            : '';

        return `
            <article class="popup-comment-item" data-review-id="${review.id}">
                ${deleteButton}
                <p style="font-weight: bold;">${reviewerName} (<span style="color: #9da000;">${starCount} ${starLabel}</span>)</p>
                <p class="popup-comment-text">${review.comment || ''}</p>
            </article>
        `;
    }).join('');
}

function loadReviewsForPopup(popup, showId) {
    const commentsSection = popup.querySelector('.popup-comments');
    if (!commentsSection) {
        return;
    }

    commentsSection.innerHTML = '<p>Henter anmeldelser...</p>';

    fetch(`${apiBaseUrl}/reviews?series_id=${encodeURIComponent(showId)}`)
        .then((response) => response.json())
        .then((reviews) => {
            if (!popup.isConnected || Number(popup.dataset.showId) !== Number(showId)) {
                return;
            }

            renderReviewList(popup, reviews);
        })
        .catch(() => {
            if (popup.isConnected) {
                commentsSection.innerHTML = '<p>Kunne ikke hente anmeldelser.</p>';
            }
        });
}

userSelect.addEventListener("change", () => {
    currentUser = Number(userSelect.value);
  console.log(currentUser);

    const popup = document.getElementById('show-popup');
    if (popup && popup.classList.contains('open')) {
            loadReviewsForPopup(popup, popup.dataset.showId);
    }
});

function formatSummary(summary) {
    return summary ? summary.replace(/<[^>]*>/g, '') : 'Ingen beskrivelse tilgjengelig.';
}

function ensurePopup(showName, showSummary, showId) {
    let popup = document.getElementById('show-popup');

    if (popup) {
        popup.querySelector('#show-popup-title').textContent = showName;
        popup.querySelector('#show-popup-summary').textContent = formatSummary(showSummary);
        popup.dataset.showName = showName;
        popup.dataset.showId = showId;
        const popupSearch = popup.querySelector('#popup-search');
        if (popupSearch) {
            popupSearch.value = '';
        }
        const popupStars = popup.querySelector('#popup-stars');
        if (popupStars) {
            popupStars.value = '0';
        }
        loadReviewsForPopup(popup, showId);
        return popup;
    }

    popup = document.createElement('div');
    popup.id = 'show-popup';
    popup.className = 'popup-overlay';
    popup.tabIndex = -1;
    popup.dataset.showName = showName;
    popup.dataset.showId = showId;
    popup.innerHTML = `
        <div class="popup-card" role="dialog" aria-modal="true" aria-labelledby="show-popup-title" aria-describedby="show-popup-summary">
            <button type="button" class="popup-close" aria-label="Lukk dialog">&times;</button>
            <div class="popup-grid">
                <h2 id="show-popup-title">${showName}</h2>
                <div class="popup-summary" id="show-popup-summary">${formatSummary(showSummary)}</div>
                <div class="popup-comment-input">
                    <form id="popup-comment-form">
                        <label for="popup-search">Legg til kommentar:</label>
                        <input type="text" id="popup-search" placeholder="Kommenter..." autocomplete="off">

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
                <div class="popup-comments" aria-label="Kommentarfelt">
                    <p>Kommentarer vises her.</p>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(popup);

    const popupCommentForm = popup.querySelector('#popup-comment-form');
    const popupStars = popup.querySelector('#popup-stars');
    const commentsSection = popup.querySelector('.popup-comments');
    const closeButton = popup.querySelector('.popup-close');

    if (commentsSection && !commentsSection.dataset.deleteHandlerAttached) {
        commentsSection.dataset.deleteHandlerAttached = 'true';
        commentsSection.addEventListener('click', (event) => {
            const deleteButton = event.target.closest('.popup-comment-delete');

            if (!deleteButton) {
                return;
            }

            const reviewId = Number(deleteButton.dataset.reviewId);
            const activeUserId = getCurrentUserId();

            if (!Number.isFinite(reviewId)) {
                alert('Fant ikke anmeldelsen som skulle slettes.');
                return;
            }

            fetch(`${apiBaseUrl}/reviews/${reviewId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: activeUserId
                })
            })
                .then((response) => response.json().then((data) => {
                    if (!response.ok) {
                        throw new Error(data.error || 'Kunne ikke slette anmeldelsen.');
                    }

                    return data;
                }))
                .then(() => loadReviewsForPopup(popup, popup.dataset.showId))
                .catch((error) => {
                    alert(error.message);
                });
        });
    }

    if (popupCommentForm && popupStars) {
        popupCommentForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const commentInput = popupCommentForm.querySelector('#popup-search');
            const commentText = commentInput.value.trim();
            const activeShowName = popup.dataset.showName;
            const activeShowId = Number(popup.dataset.showId);
            const activeUserId = getCurrentUserId();

            if (popupStars.value === '0') {
                alert('Vennligst velg en stjernevurdering før du legger til en kommentar.');
                return;
            }

            if (!Number.isFinite(activeShowId)) {
                alert('Fant ikke serien for denne vurderingen. Prøv igjen.');
                return;
            }

            console.log(`User ${activeUserId} commented: "${commentText}" with ${popupStars.value} stars on show "${activeShowName} (ID: ${activeShowId})"`);

            fetch(`${apiBaseUrl}/reviews`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    user_id: activeUserId,
                    series_id: activeShowId,
                    stars: popupStars.value,
                    comment: commentText
                })
            })
                .then((response) => response.json().then((data) => {
                    if (!response.ok) {
                        throw new Error(data.error || 'Kunne ikke lagre anmeldelsen.');
                    }

                    return data;
                }))
                .then(() => {
                    commentInput.value = '';
                    popupStars.value = '0';
                    loadReviewsForPopup(popup, activeShowId);
                })
                .catch((error) => {
                    alert(error.message);
                });
        });
    }

    popup.addEventListener('click', (event) => {
        if (event.target === popup || event.target.classList.contains('popup-close')) {
            if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
                lastFocusedElement.focus();
            }
            popup.classList.remove('open');
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            if (popup.classList.contains('open')) {
                if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
                    lastFocusedElement.focus();
                }
            }
            popup.classList.remove('open');
            return;
        }

        if (event.key === 'Tab' && popup.classList.contains('open')) {
            const focusableElements = popup.querySelectorAll(
                'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            );
            const focusable = Array.from(focusableElements).filter((element) => element.offsetParent !== null);

            if (!focusable.length) {
                return;
            }

            const firstElement = focusable[0];
            const lastElement = focusable[focusable.length - 1];

            if (event.shiftKey && document.activeElement === firstElement) {
                event.preventDefault();
                lastElement.focus();
            } else if (!event.shiftKey && document.activeElement === lastElement) {
                event.preventDefault();
                firstElement.focus();
            }
        }
    });

    loadReviewsForPopup(popup, showId);

    setTimeout(() => {
        if (closeButton) {
            closeButton.focus();
        }
    }, 0);

    return popup;
}

function openPopup(showName, showSummary, showId) {
    lastFocusedElement = document.activeElement;
    const popup = ensurePopup(showName, showSummary, showId);
    popup.classList.add('open');
}

function isPopupOpen() {
    const popup = document.getElementById('show-popup');
    return popup && popup.classList.contains('open');
}

function searchShows(query) {
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
        seriesList.replaceChildren();
        return;
    }

    seriesList.replaceChildren();

    fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(normalizedQuery)}`)
        .then(response => response.json())
        .then(data => {
            data.forEach(item => {
                let show = item.show;
                let showElement = document.createElement('button');
                showElement.type = 'button';
                showElement.classList.add('show');
                showElement.classList.add('show-card');
                let title = document.createElement('h3');
                title.textContent = show.name;

                let summary = document.createElement('p');
                summary.textContent = show.summary ? show.summary.replace(/<[^>]*>/g, '') : 'Ingen beskrivelse tilgjengelig.';

                showElement.replaceChildren(title, summary);
                seriesList.appendChild(showElement);

                showElement.addEventListener('click', () => {
                    openPopup(show.name, show.summary, show.id);
                });
            });
        });
}

if (seriesSearchForm) {
    seriesSearchForm.addEventListener('submit', (event) => {
        event.preventDefault();
        searchShows(searchInput.value);
    });
}





