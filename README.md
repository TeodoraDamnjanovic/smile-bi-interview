# smile-bi-interview

This project is a web scraper that fetches product data from a website using Puppeteer.

## Setup

1. Clone the repository:

git clone https://github.com/TeodoraDamnjanovic/smile-bi-interview.git

2. Navigate to the project directory:

cd smile-bi-interview

3. Install the dependencies:

npm install

4. Run Kafka:

docker-compose up -d

5. To run the web scraper, use the following command:

node index.js

6. Run to get kafka-container-id:

docker ps

7. Consume Kafka messages:

docker exec -it <kafka-container-id> /opt/kafka/bin/kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic bayer-data --from-beginning

8. Stop Kafka:

docker-compose down

## Output data

This will fetch the product data and write it to a file named output.json, as well as send data to Kafka.
The output data is a JSON array where each item is an object with the following structure:
{
    "price": "string",
    "shop_name": "string",
    "position": "number"
}



## Limitations

1. Dockerization Issues:

The intention was to dockerize the Node.js application and include it in a Docker Compose configuration to allow for the entire setup to be run with a single command. However, when the browser is launched in headless mode (headless: true), the program does not function as expected.
This issue may be related to the headless browser environment not handling certain operations the same way a non-headless browser would. Debugging and fixing this would require more time and possibly alternative approaches or configurations.
As a result, the application is not currently running in a Docker container, and must be run manually in a development environment.