# -*- coding: utf-8 -*-
# Generated by Django 1.9 on 2015-12-28 21:38
from __future__ import unicode_literals

import datetime
from django.db import migrations, models
from django.utils.timezone import utc


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0005_consent_imagedata'),
    ]

    operations = [
        migrations.AddField(
            model_name='studyuser',
            name='dob',
            field=models.DateTimeField(blank=True, default=datetime.datetime(2015, 12, 28, 21, 38, 9, 824319, tzinfo=utc)),
            preserve_default=False,
        ),
    ]
