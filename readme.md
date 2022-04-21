Start a postgres database with
docker run -it --rm -e POSTGRES_PASSWORD=password -p 5432:5432 --name pg -v pgdata:/var/lib/postgresql/data postgres
