import { format } from 'date-fns';
let debounceTimeout;
let selectedFighters = [];
let fighterDivisions = [`Women's Strawweight`, `Women's Flyweight`, `Women's Bantamweight`, `Flyweight`, `Bantamweight`, `Featherweight`,
     `Lightweight`, `Welterweight`, `Middleweight`, `Light Heavyweight`, `Heavyweight`];
const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];
let continentToCountries = {};
let secretFighter = {};

// Show the spinner as soon as the script runs
showSpinner();

document.addEventListener('DOMContentLoaded', () => {
    const playButton = document.getElementById("play-button");
    const introScreen = document.getElementById("intro-screen");
    const gameScreen = document.getElementById("game-screen");

    appendDate();

    if (playButton && introScreen && gameScreen) {
        playButton.addEventListener("click", () => {
            introScreen.style.display = "none";
            gameScreen.style.display = "block";
        });
    }

    // Load the continent-to-countries mapping
    fetch('/api/countries')
        .then(response => response.json())
        .then(data => {
            continentToCountries = data;
            console.log('Continent to countries mapping loaded:', continentToCountries);
        })
        .catch(error => {
            console.error('Error fetching countries:', error);
        })
        .finally(() => {
            checkAllContentLoaded();
        });

    // Fetch the secret fighter on page load
    getSecretFighter()
        .finally(() => {
            checkAllContentLoaded();
        });

    // Search input and dropdown handling
    const searchInput = document.getElementById('search-input');
    const dropdown = document.getElementById('dropdown');
    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            searchFighter();
        }, 150);
    });

    document.addEventListener('click', (event) => {
        if (!searchInput.contains(event.target) && !dropdown.contains(event.target)) {
            dropdown.style.display = 'none';
        }
    });
});

// Functions to show and hide spinner
function showSpinner() {
    const loadingSpinner = document.getElementById('loadingSpinner');
    if (loadingSpinner) loadingSpinner.style.display = 'flex';
}

function hideSpinner() {
    const loadingSpinner = document.getElementById('loadingSpinner');
    if (loadingSpinner) loadingSpinner.style.display = 'none';
}

// Function to check if all content is loaded and hide the spinner
let contentLoadCount = 0;
function checkAllContentLoaded() {
    contentLoadCount++;
    if (contentLoadCount === 2) { // Both fetch calls have completed
        hideSpinner();
    }
}
function strongText(mainString, searchString) {
    let regex = new RegExp(searchString, "gi"); 
    return mainString.replace(regex, `<strong>${searchString}</strong>`);
}

// Function to retrieve search requests from the client
function searchFighter() {
    const searchQuery = document.getElementById('search-input').value;
    var searchLen = searchQuery.length;
    if (searchQuery.length < 2) {
        clearResults();
        return;
    }
    fetch(`/api/data?name=${encodeURIComponent(searchQuery)}`)
        .then(response => response.json())
        .then(data => {
            const dropdown = document.getElementById('dropdown');
            dropdown.innerHTML = ''; // Clear previous results

            if (data.length === 0) {
                dropdown.style.display = 'none'; // Hide dropdown if no results
            } else {
                data.forEach(fighter => {
                    let displayName = `${fighter.fname} ${fighter.lname}`
                    let currentSearch = `${searchQuery}`.toLowerCase();
                    currentSearch = currentSearch.charAt(0).toLocaleUpperCase() + currentSearch.slice(1);
                    const dropdownDiv = document.createElement('div');
                    dropdownDiv.classList.add('dropdown-item');
                    dropdownDiv.innerHTML = `${strongText(displayName, currentSearch)}`;
                    dropdownDiv.addEventListener('click', () => {
                        const fightersTable = document.getElementById('fighters-table');
                        if (fightersTable.style.display === 'none') {
                            fightersTable.style.display = 'table'; // Make the table visible after guess
                        }
                        appendSelectedFighter(fighter); // Append guess to the table
                        dropdown.style.display = 'none'; // Hide dropdown after selection
                    });
                    dropdown.appendChild(dropdownDiv);
                });
                dropdown.style.display = 'block'; // Show the dropdown with results
            }
        })
        .catch(error => {
            console.error('Error fetching fighter data:', error);
        });
}

// Function to append selected fighter to the table and compare with secret fighter
function appendSelectedFighter(fighter) {
    const fightersTableBody = document.getElementById('fighters-body');
    
    // Check if secretFighter is loaded before comparing 
    if (!secretFighter || !secretFighter.id) {
        console.error('Secret fighter not loaded yet.');
        return; //Debugging
    }
    if (fighter.id === secretFighter.id) {
        winnerAlert();
    }
    
    // Check if the fighter is already in the selected list using their unique id
    if (!selectedFighters.includes(fighter.id)) {
        if (fightersTableBody.rows.length >= 6) {
            fightersTableBody.deleteRow(0); // Replaces first guess after 6 guesses, needs to be revamped!
        }

        const row = document.createElement('tr');

        // 1. Full Name
        const fullNameCell = document.createElement('td');
        fullNameCell.textContent = `${fighter.fname} ${fighter.lname}`;
        row.appendChild(fullNameCell);

        // 2. Division 
        const divisionCell = document.createElement('td');
        if (Math.abs(fighterDivisions.indexOf(fighter.division) - fighterDivisions.indexOf(secretFighter.division)) <= 1) {
            divisionCell.style.color = 'orange';
        }
        if (fighterDivisions.indexOf(fighter.division) < fighterDivisions.indexOf(secretFighter.division)) {
            divisionCell.innerHTML = fighter.division + upArrowImage();
        } else if (fighterDivisions.indexOf(fighter.division) > fighterDivisions.indexOf(secretFighter.division)) {
            divisionCell.innerHTML = fighter.division + downArrowImage();
        } else {
            divisionCell.textContent = fighter.division;
            divisionCell.style.color = 'green';
        }
        row.appendChild(divisionCell);

        // 3. Rank
        const rankCell = document.createElement('td');
        let fighterRank = fighter.rank
        let secretRank = secretFighter.rank
        if (fighterRank > secretRank) {
            rankCell.innerHTML = fighter.rank + upArrowImage();
        } else if (fighterRank < secretRank) {
            rankCell.innerHTML = fighter.rank + upArrowImage();
        } else {
            rankCell.textContent = fighter.rank;
            rankCell.style.color = 'green';
        }
        if (fighterRank == 0) {
            fighterRank = 'C'
        }
    
        row.appendChild(rankCell);

        // 4. Style
        const styleCell = document.createElement('td');
        styleCell.textContent = fighter.style;
        if (fighter.style === secretFighter.style) {
            styleCell.style.color = 'green';
        }
        row.appendChild(styleCell);

        // 5. Country
        const countryCell = document.createElement('td');
        const countCont = document.createElement('div');
        countryCell.textContent = fighter.country;
        if (continentToCountries[fighter.country] === continentToCountries[secretFighter.country]) {
            countryCell.style.color = 'orange';
        }
        if (fighter.country === secretFighter.country) {
            countryCell.style.color = 'green';
        }
        row.appendChild(countryCell);

        // 6. Debut
        const fighterDebutDate = new Date(fighter.debut);
        const secretFighterDebutDate = new Date(secretFighter.debut);
        
        // Create table cell and container
        const debutCell = document.createElement('td');
        const debCont = document.createElement('div');
        debCont.classList.add('tablecont'); // Use debCont instead of undefined "container"
        
        if (!isNaN(fighterDebutDate) && !isNaN(secretFighterDebutDate)) {
            const formattedDebutDate = format(fighterDebutDate, 'MMM yyyy');
            const debutAddon = fighterDebutDate < secretFighterDebutDate ? upArrowImage() : downArrowImage();
        
            // Add formatted date and arrow to the container
            debCont.innerHTML = formattedDebutDate + debutAddon;
        
            // Highlight if the dates match
            if (fighterDebutDate.getTime() === secretFighterDebutDate.getTime()) {
                debCont.style.color = 'green'; // Apply color to the container
            }
        } else {
            // Handle invalid dates
            debCont.textContent = 'Unknown';
            console.error('Invalid debut dates:', fighter.debut, secretFighter.debut);
        }
        
        // Append the container to the cell, then the cell to the row
        debutCell.appendChild(debCont);
        row.appendChild(debutCell);
        fightersTableBody.appendChild(row);
        // Add the fighter to the selectedFighters list
        selectedFighters.push(fighter.id);
    } else {
        displayError('Fighter already selected, please enter a different fighter!'); // Comment for edge case duplicate guess
    }
}

// Function for error pop up when duplicate guess is made
function displayError(message) {
    const existingErrorMessage = document.getElementById('error-message');
    if (existingErrorMessage) {
        existingErrorMessage.remove();
    }

    const errorMessage = document.createElement('p');
    errorMessage.id = 'error-message';
    errorMessage.textContent = message;
    errorMessage.style.color = 'red';

    document.body.appendChild(errorMessage);

    setTimeout(() => {
        errorMessage.remove();
    }, 3000);
}

// Clear dropdown function
function clearResults() {
    const dropdown = document.getElementById('dropdown');
    if (dropdown) {
        dropdown.innerHTML = '';
        dropdown.style.display = 'none';
    }
}

function getSecretFighter() {
    return fetch(`/api/data/secretfighter?id=${getRandomInt(173)}`)
        .then(response => response.json())
        .then(data => {
            secretFighter = data;
            console.log('Secret fighter fetched:', secretFighter);
        })
        .catch(error => {
            console.error('Error fetching secret fighter:', error);
        });
}

function getRandomInt(max) {
    return Math.floor(Math.random() * max) + 1;
}

function appendDate() {
    const today = new Date();
    const day = today.getDate();
    const month = monthNames[today.getMonth()];
    const year = today.getFullYear();
    const formatedDate = document.getElementById('intro-screen-date');
    if (formatedDate) formatedDate.textContent = `${day} ${month} ${year}`;
}
function winnerAlert() {
    const winnerModal = document.getElementById('winner-modal');
    const winnerMessage = document.getElementById('winner-message');
    const overlay = document.querySelector('.modal-overlay');

    if (winnerMessage && winnerModal) {
        winnerMessage.innerHTML = `Congratulations!<br>Today's UFCdle was ${secretFighter.fname} '${secretFighter.nickname}' ${secretFighter.lname}.`;
        winnerModal.style.display = 'block';
        overlay.style.display = 'block';
    }
}

// Close modal and overlay
const closeButton = document.querySelector('.x-close-button');
const overlay = document.querySelector('.modal-overlay');

if (closeButton && overlay) {
    closeButton.addEventListener('click', function() {
        document.getElementById('winner-modal').style.display = 'none';
        overlay.style.display = 'none';
    });
}
document.getElementById('close-alert')?.addEventListener('click', () => {
    const winnerModal = document.getElementById('winner-modal');
    if (winnerModal) winnerModal.style.display = 'none';
});

function upArrowImage(){
    return '<div class="image-container"><img src="imgs/uparrowguess.png" class = "arrow";></div>'

}
function downArrowImage(){
    return '<div class="image-container"><img src="imgs/uparrowguess.png" class = "flipped-arrow";></div>'

}

