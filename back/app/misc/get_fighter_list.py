import requests
from bs4 import BeautifulSoup

def get_link():
    response = requests.get('https://www.ufc.com/rankings')
    
    if response.status_code == 200:
        soup = BeautifulSoup(response.text, 'html.parser')
        fighter_list = []
        champ_list = []

        # Scrape champs
        scrape_champs = soup.find_all("div", class_="info")
        for champ in scrape_champs:
            try:
                href = champ.a['href']
                if href not in champ_list:
                    champ_list.append(href)
                    print(href)
            except (AttributeError, TypeError):
                continue 

        # Scrape ranked fighters
        scrape_fighters = soup.find_all("td", class_="views-field views-field-title") 
        skip15 = 15

        for index, fighter in enumerate(scrape_fighters):
            print(index, fighter.a['href'])
            # Skip the first 15 fighters if intended
            if skip15 > 0:
                skip15 -= 1
                continue
            
            # Skip indices from 141 to 156
            if 135 <= index <= 149:
                continue
            
            try:
                href = fighter.a['href']
                if href not in champ_list:
                    fighter_list.append(href)
                    print(href)
            except (AttributeError, TypeError):
                continue
            
        fighter_list = champ_list + fighter_list

        # Write links to file
        with open('fighter.txt', mode='w', newline='', encoding='utf-8') as file:
            for link in fighter_list:
                file.write(link + '\n')
                
        return fighter_list  # Optional return if you want to use the list elsewhere

    else:
        print(f"Failed to retrieve the page. Status code: {response.status_code}")

# Call the function
get_link()
