import requests
from bs4 import BeautifulSoup
import csv
from datetime import datetime

fighter_data = []
rank_counter = 1  # counter to auto append rank based on order of fighters in text file
csv_file = 'fighter_data.csv'
div_counter = 0
divisions = ["Flyweight", "Bantamweight", "Featherweight", "Lightweight", "Welterweight", "Middleweight", "Light Heavyweight", "Heavyweight", "Women's Strawweight", "Women's Flyweight", "Women's Bantamweight"]

# converts date format so its more in a more readable format
# firsttime using datetime... seems good but i think theres a better way i can do this ??
def convert_date(date_str):
    try:
        date_obj = datetime.strptime(date_str, '%b. %d, %Y')
        return date_obj.strftime('%Y-%m-%d')
    except ValueError:
        return None

# added an id counter here instead of db because i didn't think to do it earlier
id_counter = 1

def store_fighter_data(textfile):
    global id_counter
    global rank_counter
    global div_counter
    response = requests.get(f'https://www.ufc.com{textfile}')
    if response.status_code == 200:
        fname = {}
        
        # Assign the current id and increment it
        fname['id'] = id_counter
        id_counter += 1

        soup = BeautifulSoup(response.text, 'html.parser')

        # Get Name
        scrape_name = soup.find("h1", class_="hero-profile__name")
        namesplit = scrape_name.text.split()
        if len(namesplit) > 0:
            fname['fname'] = namesplit[0]

        if len(namesplit) == 1:
            fname['lname'] = ''
        elif len(namesplit) == 2:
            fname['lname'] = namesplit[1]
        elif len(namesplit) > 2:
            fname['lname'] = ' '.join(namesplit[1:])

        # Get Nickname
        if soup.find("p", class_="hero-profile__nickname"):
            scrape_nickname = soup.find("p", class_="hero-profile__nickname")
            fname['nickname'] = scrape_nickname.text.strip('"')
        else:
            fname['nickname'] = None
        
        # Scrape Division
        if len(fighter_data) <= 10:
            scrape_division = soup.find_all("div", class_="hero-profile__division")
            if scrape_division:
                scrape_division = soup.find("p", class_="hero-profile__division-title")
                fdivision = scrape_division.text.strip(' Division')
                fname['division'] = fdivision
        else:
            fname['division'] = divisions[div_counter]
            print(f"{fname['fname']} {fname['lname']} {fname['division']}")
          

        # Scrape Fighting Style
        scrape_style = soup.find_all("div", class_="c-bio__field c-bio__field--border-bottom-small-screens")
        fighting_style = 'MMA'  # Default value if not found
        for elem in scrape_style:
            label = elem.find("div", class_="c-bio__label")
            value = elem.find("div", class_="c-bio__text")
            if label and "Fighting style" in label.text:
                fighting_style = value.text.strip()
                break
        fname['style'] = fighting_style

        # Scrape Country
        scrape_country = soup.find_all("div", class_= "c-bio__field c-bio__field--border-bottom-small-screens")
        hometown = 'Unknown'  # Default value
        for elem in scrape_country:
            if elem.find("div", class_= "c-bio__label").text == 'Hometown':
                hometown = elem.text.strip()
                break

        if ',' in hometown:
            fname['country'] = hometown.strip('"').split(',')[-1].strip()
        else:
            fname['country'] = hometown.split('\n')[-1].strip()

        # Scrape Rank
        if len(fighter_data) <= 10:
            fname['rank'] = 0  
        else:
            fname['rank'] = rank_counter
            rank_counter += 1
            if rank_counter > 15:
                rank_counter = 1
                div_counter += 1

        # Scrape debut
        scrape_debut = soup.find_all("div", class_="c-bio__field")
        debut = 'Unknown'
        for elem in scrape_debut:
            if 'Octagon' in elem.text:
                debut = elem.text
                break
        fname['debut'] = convert_date(debut.strip().split('\n')[-1])

        # Append the fighter data to the list
        fighter_data.append(fname)

# Function to write fighter data to CSV
def write_to_csv(fighter_list):
    with open(csv_file, mode='w', newline='') as file:
        # Add 'id' to the list of fieldnames
        writer = csv.DictWriter(file, fieldnames=['id', 'fname', 'lname', 'nickname', 'division', 'rank', 'style', 'country', 'debut'])
        writer.writeheader()
        for fighter in fighter_list:
            writer.writerow(fighter)

# Read and process each line from the text file
def make_csv():
    with open('fighter.txt') as f:
        for line in f:
            store_fighter_data(line.strip())
    # Write all collected data to CSV
    write_to_csv(fighter_data)

# Run the function
make_csv()
