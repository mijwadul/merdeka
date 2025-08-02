import click
from flask.cli import with_appcontext
from .extensions import db
from .models import User, School
from flask_bcrypt import Bcrypt

bcrypt = Bcrypt()

@click.command('create-developer')
@with_appcontext
@click.argument('email')
@click.argument('username')
@click.argument('password')
def create_developer_command(email, username, password):
    """Creates a new user with the Developer role."""
    if User.query.filter((User.email == email) | (User.username == username)).first():
        click.echo('Error: A user with that email or username already exists.')
        return

    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')

    developer = User(
        email=email,
        username=username,
        password_hash=hashed_password,
        role='Developer'
    )

    db.session.add(developer)
    db.session.commit()

    click.echo(f'Developer account for "{username}" created successfully.')

@click.command('create-school')
@with_appcontext
@click.argument('name')
def create_school_command(name):
    """Creates a new school."""
    if School.query.filter_by(name=name).first():
        click.echo('Error: A school with that name already exists.')
        return
    
    new_school = School(name=name)
    db.session.add(new_school)
    db.session.commit()
    click.echo(f'School "{name}" created successfully.')

def init_app(app):
    bcrypt.init_app(app)
    app.cli.add_command(create_developer_command)
    app.cli.add_command(create_school_command) # Register the new command