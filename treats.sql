-- DROP TABLE treats;

CREATE TABLE treats (
	id SERIAL PRIMARY KEY,
	name varchar(255),
	description text,
	pic varchar(255)
);

INSERT INTO treats (name, description, pic)
VALUES ('Cupcake', 'A fantastic cupcake', '/assets/cupcake.jpg'),
('Donuts', 'Mmmm donuts', '/assets/donuts.jpg');
